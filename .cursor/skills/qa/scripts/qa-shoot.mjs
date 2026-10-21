#!/usr/bin/env node
// QA visual runner: drives the built app in real Chrome, saves screenshots and
// measures motion (modal "jumps"), layout shift, console errors.
//
//   npm run build
//   node .cursor/skills/qa/scripts/qa-shoot.mjs --steps steps.json [--out dir]
//        [--base http://127.0.0.1:4180] [--port 4180] [--viewport 375x812]
//        [--dark] [--reduced-motion] [--data sheets.json] [--sms sms.json] [--init init.js] [--log-requests] [--headed]
//
// Run from the repo root. Without --base it starts `vite preview` on --port
// (never 4173 — the e2e suite owns it). See references/visual-verify.md.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'

const args = parseArgs(process.argv.slice(2))
if (!args.steps) fail('Missing --steps <file.json>. See references/visual-verify.md.')

const root = process.cwd()
const port = Number(args.port ?? 4180)
const base = args.base ?? `http://127.0.0.1:${port}`
const [vw, vh] = String(args.viewport ?? '375x812')
  .split('x')
  .map(Number)
const out = resolve(args.out ?? join(tmpdir(), 'qa-shots', String(Date.now())))
mkdirSync(out, { recursive: true })

const { mockGoogleApis, seedMockAppState } = await import(
  pathToFileURL(resolve(root, 'e2e/helpers/mockAppState.ts')).href
)

const steps = JSON.parse(readFileSync(args.steps, 'utf8'))
const data = args.data ? JSON.parse(readFileSync(args.data, 'utf8')) : null
const report = { out, base, viewport: [vw, vh], steps: [], consoleErrors: [], pageErrors: [] }

let server = null
if (!args.base) server = await startPreview()

const browser = await chromium.launch({ channel: 'chrome', headless: !args.headed })
try {
  const context = await browser.newContext({
    viewport: { width: vw, height: vh },
    locale: 'fa-IR',
    colorScheme: args.dark ? 'dark' : 'light',
    reducedMotion: args['reduced-motion'] ? 'reduce' : 'no-preference',
    // The PWA service worker bypasses page.route mocks and logs the user out.
    serviceWorkers: 'block'
  })
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  page.on('console', m => m.type() === 'error' && report.consoleErrors.push(m.text()))
  if (args['log-requests']) {
    report.requests = []
    page.on(
      'request',
      r =>
        /googleapis.com/.test(r.url()) &&
        report.requests.push(`${r.method()} ${decodeURIComponent(r.url()).slice(0, 160)}`)
    )
  }
  page.on('pageerror', e => report.pageErrors.push(String(e)))
  await page.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await mockGoogleApis(page)
  if (data) await mockSheetData(page, data)
  if (args.sms) await installAndroidSmsBridge(page, JSON.parse(readFileSync(args.sms, 'utf8')))
  await seedMockAppState(page)
  if (data) await seedSheetStore(page, data)
  // The app picks its theme from the saved settings, not from the browser's colour scheme.
  if (args.dark) {
    await page.addInitScript(() => {
      const settings = JSON.parse(localStorage.getItem('accounting_settings') ?? '{}')

      localStorage.setItem('accounting_settings', JSON.stringify({ ...settings, theme: 'dark' }))
    })
  }
  // Runs in the page before the app, after the seed: tweak localStorage (settings, prefs) here.
  if (args.init) await page.addInitScript({ path: resolve(args.init) })

  let shotIndex = 0
  for (const step of steps) {
    const [kind] = Object.keys(step)
    const arg = step[kind]
    const entry = { step: kind, arg }
    if (kind === 'goto') {
      await page.goto(base + arg, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(300)
      // The build shows a setup screen when the client id was not baked in: a screenshot of it proves nothing.
      if (await page.getByText('VITE_GOOGLE_CLIENT_ID').count()) {
        throw new Error(
          'App shows the OAuth setup screen. Rebuild with VITE_GOOGLE_CLIENT_ID set (see visual-verify.md).'
        )
      }
    } else if (kind === 'click') await visible(page, arg).click()
    else if (kind === 'fill') await visible(page, arg[0]).fill(String(arg[1]))
    else if (kind === 'press') await page.keyboard.press(arg)
    else if (kind === 'wait') await page.waitForTimeout(arg)
    else if (kind === 'viewport') await page.setViewportSize({ width: arg[0], height: arg[1] })
    else if (kind === 'eval') entry.result = await page.evaluate(arg)
    else if (kind === 'shot') {
      const file = join(out, `${String(++shotIndex).padStart(2, '0')}-${arg}.png`)
      await page.screenshot({ path: file })
      entry.file = file
    } else if (kind === 'motion') entry.result = await measureMotion(page, arg)
    else fail(`Unknown step "${kind}".`)
    report.steps.push(entry)
  }
  report.cls = await page.evaluate(() => Number(window.__cls.toFixed(4)))
} catch (error) {
  report.fatal = String(error)
} finally {
  await browser.close()
  server?.kill()
}

writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
process.exit(report.fatal ? 1 : 0)

/** Samples the `watch` element every animation frame while `trigger` is clicked. */
async function measureMotion(page, { name, trigger, watch, ms = 800 }) {
  await page.evaluate(selector => {
    window.__qa = { frames: [], on: true }
    const t0 = performance.now()
    const tick = () => {
      if (!window.__qa.on) return
      const el = document.querySelector(selector)
      const r = el?.getBoundingClientRect()
      window.__qa.frames.push({
        t: Math.round(performance.now() - t0),
        rect: r ? [r.top, r.left, r.width, r.height].map(n => Math.round(n * 10) / 10) : null,
        opacity: el ? Number(getComputedStyle(el).opacity) : null
      })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, watch)
  const clsBefore = await page.evaluate(() => window.__cls)
  await visible(page, trigger).click()
  await page.waitForTimeout(ms)
  const frames = await page.evaluate(() => {
    window.__qa.on = false
    return window.__qa.frames
  })
  const clsDelta = (await page.evaluate(() => window.__cls)) - clsBefore
  writeFileSync(join(out, `motion-${name}.json`), JSON.stringify(frames))
  return analyzeMotion(frames, clsDelta)
}

function analyzeMotion(frames, clsDelta) {
  const visible = frames.filter(f => f.rect)
  if (visible.length === 0) return { verdict: 'NEVER_VISIBLE', frames: frames.length }
  let maxStep = 0
  let reversals = 0
  let sizeChangesAfterSettle = 0
  let lastSign = 0
  for (let i = 1; i < visible.length; i += 1) {
    const [t0, , w0, h0] = visible[i - 1].rect
    const [t1, , w1, h1] = visible[i].rect
    const dy = t1 - t0
    maxStep = Math.max(maxStep, Math.abs(dy))
    const sign = Math.abs(dy) < 1 ? 0 : Math.sign(dy)
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) reversals += 1
    if (sign !== 0) lastSign = sign
    if (i > 3 && (Math.abs(h1 - h0) > 1 || Math.abs(w1 - w0) > 1)) sizeChangesAfterSettle += 1
  }
  const longGaps = frames.filter((f, i) => i > 0 && f.t - frames[i - 1].t > 50).length
  const last = visible[visible.length - 1]
  return {
    frames: frames.length,
    visibleFrames: visible.length,
    firstVisibleAtMs: visible[0].t,
    firstRect: visible[0].rect,
    finalRect: last.rect,
    finalOpacity: last.opacity,
    maxVerticalStepPx: Math.round(maxStep * 10) / 10,
    directionReversals: reversals,
    sizeChangesAfterSettle,
    droppedFrameGaps: longGaps,
    layoutShift: Number(clsDelta.toFixed(4)),
    verdict: reversals > 0 || sizeChangesAfterSettle > 0 || clsDelta > 0.02 ? 'JUMPY' : 'SMOOTH'
  }
}

/** Answers Sheets reads (single range and batchGet) with rows from `data` ({ "SheetTitle": [[row], ...] }). */
async function mockSheetData(page, sheets) {
  const titleOf = range => decodeURIComponent(range).split('!')[0].replace(/^'|'$/g, '')

  await page.route('**/spreadsheets/*/values/**', async route => {
    if (route.request().method() !== 'GET') return route.fallback()
    const range = new URL(route.request().url()).pathname.split('/values/')[1] ?? ''

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: sheets[titleOf(range)] ?? []
      })
    })
  })
  await page.route('**/values:batchGet**', async route => {
    const ranges = new URL(route.request().url()).searchParams.getAll('ranges')
    const valueRanges = ranges.map(range => {
      return { range, majorDimension: 'ROWS', values: sheets[titleOf(range)] ?? [] }
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valueRanges })
    })
  })
}

async function startPreview() {
  if (!existsSync(join(root, 'dist/index.html'))) fail('No dist/. Run `npm run build` first.')
  const vite = join(root, 'node_modules/vite/bin/vite.js')
  const child = spawn(
    process.execPath,
    [vite, 'preview', '--port', String(port), '--host', '127.0.0.1'],
    {
      cwd: root,
      stdio: 'ignore'
    }
  )
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(base)).ok) return child
    } catch {
      /* server not ready yet */
    }
    await new Promise(r => setTimeout(r, 250))
  }
  child.kill()
  return fail(`vite preview did not start on port ${port} (is it in use?).`)
}

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) parsed[key] = true
    else {
      parsed[key] = next
      i += 1
    }
  }
  return parsed
}

function fail(message) {
  console.error(`qa-shoot: ${message}`)
  process.exit(2)
}

/** First VISIBLE match: the sidebar and bottom nav both render the same labels. */
function visible(page, selector) {
  return page.locator(`${selector} >> visible=true`).first()
}

/**
 * Makes the app believe it runs in the Android app with these pending bank SMS (a JSON array of
 * { id, sender, body, receivedAt, source }). Only the BankSms plugin answers; other native
 * plugins resolve with {}. `window.__qaHandled` collects the ids the app marked handled.
 */
async function installAndroidSmsBridge(page, items) {
  await page.addInitScript(pending => {
    window.__qaSms = pending
    window.__qaHandled = []
    window.androidBridge = { postMessage() {} }
    // Capacitor only builds a plugin proxy for names listed in PluginHeaders.
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
        if (method === 'listInbox') return { items: [] }
        if (method === 'markHandled') {
          window.__qaHandled.push(...options.ids)
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

/** The app reads tabs from its local sheet store first, so `data` is seeded there as well. */
async function seedSheetStore(page, sheets) {
  const { spreadsheetId } = JSON.parse(
    readFileSync(resolve(root, 'e2e/helpers/mockAppSeed.json'), 'utf8')
  )

  await page.addInitScript(
    ({ id, tabs }) => {
      const key = `accounting_sheet_store_${id}`
      const store = JSON.parse(localStorage.getItem(key) ?? '{}')

      store.sheets = { ...store.sheets, ...tabs }
      localStorage.setItem(key, JSON.stringify(store))
    },
    { id: spreadsheetId, tabs: sheets }
  )
}
