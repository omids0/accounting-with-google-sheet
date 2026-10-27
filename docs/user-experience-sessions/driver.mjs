#!/usr/bin/env node
// Interactive "user" driver for simulated end-user sessions.
//
// One process = one user = one real-Chrome page that stays open between commands, so state
// (opened modals, typed text, saved records) persists like on a phone. Commands arrive as JSON
// over HTTP; the reply is JSON. Run from the repo root after `npm run build`:
//
//   node docs/user-experience-sessions/driver.mjs --port 4301 --data data/mother.json \
//        [--sms data/sms-mother.json] [--init data/init-mother.js] [--out dir] [--viewport 375x812] [--user mother]
//
//   curl -s localhost:4301/do -d '{"action":"goto","path":"/"}'
//
// Actions: goto{path} click{text|selector,nth?} fill{label|selector,value} type{text}
//   press{key} scroll{dy} back reload wait{ms} shot{name} text eval{js} close
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'

import { createSheetsMock, installSheetsMock } from './sheetsMock.mjs'

const args = parseArgs(process.argv.slice(2))
const root = process.cwd()
const port = Number(args.port ?? 4301)
const previewPort = port + 100
const base = args.base ?? `http://127.0.0.1:${previewPort}`
const dir = resolve(args.out ?? join('docs/user-experience-sessions/runs', args.user ?? `u${port}`))
const [vw, vh] = String(args.viewport ?? '375x812').split('x').map(Number)
mkdirSync(dir, { recursive: true })

const { mockGoogleApis, seedMockAppState } = await import(
  pathToFileURL(resolve(root, 'e2e/helpers/mockAppState.ts')).href
)
const sheets = args.data ? JSON.parse(readFileSync(resolve(args.data), 'utf8')) : null
const log = { consoleErrors: [], pageErrors: [], actions: [] }
const preview = args.base ? null : await startPreview()
const browser = await chromium.launch({ channel: 'chrome', headless: !args.headed })
const context = await browser.newContext({
  viewport: { width: vw, height: vh },
  locale: 'fa-IR',
  serviceWorkers: 'block'
})
const page = await context.newPage()
page.setDefaultTimeout(6000)
page.on('console', m => m.type() === 'error' && log.consoleErrors.push(m.text()))
page.on('pageerror', e => log.pageErrors.push(String(e)))
log.requests = []
page.on('request', r => {
  if (!/googleapis.com/.test(r.url()) || r.method() === 'GET') return
  log.requests.push(`${r.method()} ${decodeURIComponent(r.url()).slice(0, 200)} ${(r.postData() ?? '').slice(0, 300)}`)
})
await mockGoogleApis(page)
const seed = JSON.parse(readFileSync(resolve(root, 'e2e/helpers/mockAppSeed.json'), 'utf8'))
const sheetsMock = createSheetsMock(sheets, Object.keys(seed.sheets))

await installSheetsMock(page, sheetsMock)
if (args.sms) await installAndroidSmsBridge(page, JSON.parse(readFileSync(resolve(args.sms), 'utf8')))
await seedMockAppState(page)
if (sheets) await seedSheetStore(page, sheets)
// Runs in the page before the app, after the seed: edits localStorage (settings, currency).
if (args.init) await page.addInitScript({ path: resolve(args.init) })

let shots = 0
const server = createServer(async (req, res) => {
  let body = ''
  for await (const chunk of req) body += chunk
  let result
  try {
    result = await run(JSON.parse(body || '{}'))
  } catch (error) {
    result = { ok: false, error: String(error).split('\n')[0] }
  }
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(result))
})
server.listen(port, '127.0.0.1', () => console.log(`driver ready on ${port} (${base})`))

async function run(cmd) {
  const { action } = cmd
  log.actions.push(cmd)
  if (action === 'goto') {
    // Git Bash rewrites an argument like "/" into "C:/Program Files/Git/": undo that.
    const raw = String(cmd.path ?? '/').replace(/^[A-Za-z]:[\\/].*?[\\/]Git(?=[\\/]|$)/, '')
    const path = raw.startsWith('/') ? raw : `/${raw}`

    await page.goto(base + path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    if (await page.getByText('VITE_GOOGLE_CLIENT_ID').count())
      return { ok: false, error: 'OAuth setup screen: .env missing at build time' }
  } else if (action === 'click') await target(cmd).click()
  else if (action === 'fill') await field(cmd).fill(String(cmd.value))
  else if (action === 'type') await page.keyboard.type(String(cmd.text), { delay: 20 })
  else if (action === 'press') await page.keyboard.press(cmd.key)
  else if (action === 'scroll') await page.mouse.wheel(0, cmd.dy ?? 400)
  else if (action === 'back') await page.goBack()
  else if (action === 'reload') await page.reload({ waitUntil: 'domcontentloaded' })
  else if (action === 'wait') await page.waitForTimeout(cmd.ms ?? 500)
  else if (action === 'eval') return { ok: true, result: await page.evaluate(cmd.js) }
  else if (action === 'text') return { ok: true, url: page.url(), text: await visibleText() }
  else if (action === 'sheet')
    return { ok: true, rows: (sheetsMock.tabs.get(cmd.title)?.rows ?? []).slice(-(cmd.n ?? 20)) }
  else if (action === 'requests') return { ok: true, requests: log.requests.slice(-(cmd.n ?? 15)) }
  else if (action === 'close') return close()
  else if (action === 'shot') {
    const file = join(dir, `${String(++shots).padStart(2, '0')}-${cmd.name ?? 'screen'}.png`)
    await page.screenshot({ path: file, fullPage: Boolean(cmd.full) })
    return { ok: true, file }
  } else return { ok: false, error: `unknown action ${action}` }
  await page.waitForTimeout(250)
  return { ok: true, url: page.url(), consoleErrors: log.consoleErrors.length }
}

/** Click target by visible text (button, link, tab, then any text) or by CSS selector. */
function target({ text, selector, nth = 0 }) {
  if (selector) return page.locator(`${selector} >> visible=true`).nth(nth)
  const exact = { name: text, exact: false }
  const roles = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'option']
  const parts = roles.map(role => page.getByRole(role, exact))
  parts.push(page.getByText(text))
  let all = parts[0]
  for (const part of parts.slice(1)) all = all.or(part)
  return all.locator('visible=true').nth(nth)
}

/** Field by label, placeholder, or CSS selector; falls back to the nth visible input. */
function field({ label, selector, nth = 0 }) {
  if (selector) return page.locator(`${selector} >> visible=true`).nth(nth)
  if (typeof label === 'number')
    return page.locator('input, textarea, [contenteditable=true]').locator('visible=true').nth(label)
  return page
    .getByLabel(label)
    .or(page.getByPlaceholder(label))
    .locator('visible=true')
    .nth(nth)
}

async function visibleText() {
  return page.evaluate(() => {
    const clean = value => value.replace(/\s+/g, ' ').trim()
    const main = document.querySelector('[role=dialog]') ?? document.body

    return clean(main.innerText).slice(0, 6000)
  })
}

async function close() {
  writeFileSync(join(dir, 'session-log.json'), JSON.stringify(log, null, 2))
  setTimeout(async () => {
    await browser.close()
    preview?.kill()
    server.close()
    process.exit(0)
  }, 100)
  return { ok: true, closed: true, log: join(dir, 'session-log.json') }
}

async function startPreview() {
  if (!existsSync(join(root, 'dist/index.html'))) fail('No dist/. Run `npm run build` first.')
  const vite = join(root, 'node_modules/vite/bin/vite.js')
  const child = spawn(
    process.execPath,
    [vite, 'preview', '--port', String(previewPort), '--host', '127.0.0.1'],
    { cwd: root, stdio: 'ignore' }
  )
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(base)).ok) return child
    } catch {
      /* not ready yet */
    }
    await new Promise(r => setTimeout(r, 250))
  }
  child.kill()
  return fail(`vite preview did not start on ${previewPort}`)
}

async function seedSheetStore(pg, tabs) {
  const { spreadsheetId } = JSON.parse(
    readFileSync(resolve(root, 'e2e/helpers/mockAppSeed.json'), 'utf8')
  )

  await pg.addInitScript(
    ({ id, data }) => {
      const key = `accounting_sheet_store_${id}`
      const store = JSON.parse(localStorage.getItem(key) ?? '{}')

      store.sheets = { ...store.sheets, ...data }
      localStorage.setItem(key, JSON.stringify(store))
    },
    { id: spreadsheetId, data: tabs }
  )
}

/** Same Android + BankSms plugin shim as .claude/skills/qa/scripts/qa-shoot.mjs. */
async function installAndroidSmsBridge(pg, items) {
  await pg.addInitScript(pending => {
    // A reload re-runs this script: keep ids the app already marked handled, like the real queue.
    const key = '__qaHandledIds'
    const done = JSON.parse(localStorage.getItem(key) ?? '[]')

    window.__qaSms = pending.filter(item => !done.includes(item.id))
    window.__qaHandled = [...done]
    window.androidBridge = { postMessage() {} }
    const methods = [
      'checkPermissions',
      'requestPermissions',
      'getPending',
      'markHandled',
      'scanInbox',
      'listInbox',
      'clear',
      'setEnabled',
      'setViewDays',
      'setNightlyDigest',
      'setLastOperationDate',
      'setDigestNotes',
      'openNotificationSettings'
    ].map(name => ({ name, rtype: 'promise' }))

    window.Capacitor = {
      PluginHeaders: [{ name: 'BankSms', methods }],
      nativePromise: async (plugin, method, options) => {
        if (plugin !== 'BankSms') return {}
        if (method === 'checkPermissions' || method === 'requestPermissions')
          return { sms: 'granted' }
        if (method === 'getPending') return { items: window.__qaSms }
        if (method === 'scanInbox') return { added: 0, scannedAt: Date.now() }
        if (method === 'listInbox') return { items: window.__qaSms }
        if (method === 'markHandled') {
          window.__qaHandled.push(...options.ids)
          localStorage.setItem(key, JSON.stringify(window.__qaHandled))
          window.__qaSms = window.__qaSms.filter(item => !options.ids.includes(item.id))
        }
        return {}
      }
    }
    localStorage.setItem(
      'accounting_bank_sms',
      JSON.stringify({ enabled: true, lastScanAt: Date.now() })
    )
  }, items)
}

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) parsed[argv[i].slice(2)] = true
    else {
      parsed[argv[i].slice(2)] = next
      i += 1
    }
  }
  return parsed
}

function fail(message) {
  console.error(`driver: ${message}`)
  process.exit(2)
}
