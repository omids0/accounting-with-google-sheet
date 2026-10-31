#!/usr/bin/env node
// End-to-end smoke of the shared account («حساب مشترک») with two phones and ONE fake Google.
//
//   cd <repo with dist/>   (e.g. D:\project\myProjects\accounting, after `npm run build`)
//   node <worktree>/docs/user-experience-sessions/sharedSmoke.mjs [--keep] [--headed]
//        [--backend-port 4900] [--a-port 4911] [--b-port 4912]
//
// Starts mockGoogle.mjs and two driver.mjs phones (A = mother@test.local, B = merchant@test.local),
// then walks the app through do.mjs: A sets up the shared account and invites B; B connects and
// opens it; both add expenses and see each other's after a reload; both show the member list.
// Exit code 0 = every step passed. Writes runs/shared/smoke-log.txt. Closes only what it started.
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, openSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = {}

for (let i = 2; i < process.argv.length; i += 1) {
  if (!process.argv[i].startsWith('--')) continue
  const next = process.argv[i + 1]
  const isValue = next !== undefined && !next.startsWith('--')

  args[process.argv[i].slice(2)] = isValue ? next : true
  if (isValue) i += 1
}
const ports = { google: Number(args['backend-port'] ?? 4900), A: Number(args['a-port'] ?? 4911), B: Number(args['b-port'] ?? 4912) }
const backend = `http://127.0.0.1:${ports.google}`
const outDir = join(here, 'runs', 'shared')
const children = []
const results = []
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'smoke-log.txt'), `shared smoke ${new Date().toISOString()}\n`)

function say(line) {
  console.log(line)
  appendFileSync(join(outDir, 'smoke-log.txt'), `${line}\n`)
}

/** One do.mjs call; returns the driver's JSON reply. */
function act(who, action, pairs = {}) {
  const kv = Object.entries(pairs).map(([key, value]) => `${key}=${value}`)
  const out = execFileSync(process.execPath, [join(here, 'do.mjs'), String(ports[who]), action, ...kv], { encoding: 'utf8' })

  return JSON.parse(out)
}

const text = who => act(who, 'text').text ?? ''
/** The screen text with Persian digits and thousands separators turned into plain digits. */
const plainDigits = value => value.replace(/[۰-۹]/g, ch => String(ch.charCodeAt(0) - 0x6f0)).replace(/[٬,]/g, '')
const click = (who, label) => act(who, 'click', { text: label })
const clickCss = (who, selector) => act(who, 'click', { selector })
// `connection: close`: execFileSync blocks this process, so a kept-alive socket would be stale.
const plain = (url, init = {}) => fetch(url, { ...init, headers: { connection: 'close', ...init.headers } })
const google = async path => (await plain(backend + path)).json()

async function waitFor(what, probe, ms = 12000) {
  const end = Date.now() + ms
  let last

  while (Date.now() < end) {
    last = await probe()
    if (last) return last
    await sleep(400)
  }
  throw new Error(`timed out waiting for ${what}`)
}

async function step(name, fn) {
  try {
    const detail = await fn()

    results.push({ name, ok: true })
    say(`PASS  ${name}${detail ? `  [${detail}]` : ''}`)
  } catch (error) {
    results.push({ name, ok: false })
    say(`FAIL  ${name}: ${String(error.message).split('\n')[0]} ${error.cause?.message ?? ''}`)
    throw error
  }
}

function expect(cond, message) {
  if (!cond) throw new Error(message)
}

function start(label, script, scriptArgs) {
  const log = openSync(join(outDir, `${label.replace(/W+/g, '-')}.log`), 'w')
  const child = spawn(process.execPath, [join(here, script), ...scriptArgs], { cwd: process.cwd(), stdio: ['ignore', log, log] })

  children.push({ label, child })

  return child
}

async function expenseVia(who, amount, title) {
  clickCss(who, 'button[aria-label="ثبت در حساب مشترک"]')
  await sleep(400)
  clickCss(who, 'button[aria-label="هزینه"]')
  await sleep(600)
  clickCss(who, '[role=dialog] button[aria-label="مبلغ"]')
  await sleep(400)
  act(who, 'type', { text: amount })
  click(who, 'تأیید')
  act(who, 'fill', { label: 'مثلاً میوه و سبزی', value: title })
  clickCss(who, '[role=dialog] button[aria-label="دسته هزینه"]')
  await sleep(500)
  clickCss(who, '[role=dialog]:has-text("مدیریت دسته‌ها") button:has-text("خوراک")')
  await sleep(300)
  clickCss(who, '[role=dialog] button[type=submit]')
  await waitFor(`${who}'s expense «${title}» on screen`, () => text(who).includes(title), 8000)
}

const sharedFile = async () => (await google('/__debug/files')).find(file => file.name.includes('مشترک'))
const sharedRows = async (tab, id) => (await google(`/__debug/state?spreadsheet=${id}&tab=${encodeURIComponent(tab)}`)).rows ?? []

/** Rows of a shared tab that match, waiting for the app's save queue to reach the backend. */
async function rowsWhere(tab, test) {
  const probe = async () => {
    const rows = (await sharedRows(tab, (await sharedFile()).id)).map(row => row.map(String)).filter(test)

    return rows.length ? rows : null
  }

  try {
    return await waitFor(`a saved row in «${tab}»`, probe, 15000)
  } catch (error) {
    const all = await sharedRows(tab, (await sharedFile()).id)

    throw new Error(`${error.message}; the sheet has: ${JSON.stringify(all.slice(-3))}`)
  }
}

async function main() {
  const common = ['--backend', backend, ...(args.headed ? ['--headed'] : [])]

  start('google', 'mockGoogle.mjs', ['--port', String(ports.google)])
  await waitFor('mockGoogle', async () => (await plain(`${backend}/__health`).catch(() => null))?.ok, 8000)
  for (const [who, email, name, data] of [['A', 'mother@test.local', 'مادر', 'mother'], ['B', 'merchant@test.local', 'بازاری', 'merchant-manager']]) {
    start(`driver ${who}`, 'driver.mjs', ['--port', String(ports[who]), ...common, '--email', email, '--name', name, '--data', join(here, 'data', `${data}.json`), '--init', join(here, 'data', `init-${data === 'mother' ? 'mother' : 'merchant-manager'}.js`), '--out', join(outDir, who)])
  }
  for (const who of ['A', 'B']) await waitFor(`driver ${who}`, async () => (await plain(`http://127.0.0.1:${ports[who]}/do`, { method: 'POST', body: '{"action":"me"}' }).catch(() => null))?.ok, 40000)

  await step('A opens «فضاهای من» (no shared account yet)', async () => {
    act('A', 'goto', { path: '/buildings' })
    await waitFor('the shared card', () => text('A').includes('حساب مشترک') && text('A').includes('راه‌اندازی'))
  })
  await step('A walks the setup wizard: intro, name + B\'s e-mail, split', async () => {
    click('A', 'راه‌اندازی')
    await waitFor('wizard step 1', () => text('A').includes('قدم ۱ از ۳'))
    click('A', 'ادامه')
    await waitFor('wizard step 2', () => text('A').includes('قدم ۲ از ۳'))
    act('A', 'fill', { label: 'نام حساب مشترک', value: 'خرج خانه' })
    act('A', 'fill', { label: 'ایمیل حساب گوگل شریک', value: 'merchant@test.local' })
    click('A', 'ادامه')
    await waitFor('wizard step 3', () => text('A').includes('قدم ۳ از ۳'))
  })
  await step('A creates the account and invites B; the app opens /shared', async () => {
    click('A', 'ساخت فضا و ارسال دعوت')
    await waitFor('/shared', () => act('A', 'text').url.endsWith('/shared'), 25000)
    const file = await sharedFile()

    expect(file, 'no shared spreadsheet on the backend')
    expect(file.owner === 'mother@test.local', `owner is ${file.owner}`)
    expect(file.permissions.includes('merchant@test.local:writer'), `permissions: ${file.permissions}`)
    expect((await google('/__debug/mails')).length === 1, 'Drive sent no invitation e-mail')

    return `${file.name}; ${file.permissions.join(', ')}`
  })
  await step('the shared sheet carries its type marker and A as owner', async () => {
    const file = await sharedFile()
    const rows = await sharedRows('تنظیمات دوره', file.id)

    expect(rows.some(row => row[0] === 'نوع فضا' && row[1] === 'حساب مشترک'), 'no «نوع فضا» row')
    expect(rows.some(row => row[0] === 'نقش:mother@test.local' && row[1] === 'owner'), 'no owner row')
    expect(rows.some(row => row[0] === 'نقش:merchant@test.local'), 'B has no role row after the invitation')
  })
  await step('B sees «مشترک خرج خانه» in «اتصال به حساب مشترک» and connects', async () => {
    act('B', 'goto', { path: '/buildings' })
    await waitFor('B\'s shared card', () => text('B').includes('اتصال به حساب مشترک'))
    click('B', 'اتصال به حساب مشترک')
    await waitFor('the candidate list', () => text('B').includes('مشترک خرج خانه'))
    click('B', 'مشترک خرج خانه')
    await waitFor('/shared', () => act('B', 'text').url.endsWith('/shared'), 25000)
    expect(text('B').includes('مادر'), 'B does not see A\'s name on the shared home')
  })
  await step('A adds a 450,000 expense in the shared book', async () => {
    await expenseVia('A', '450000', 'میوه و سبزی')
    const rows = await rowsWhere('هزینه', row => row.includes('میوه و سبزی') && row.includes('450000'))

    expect(rows.length, 'row missing in the shared sheet on the backend')
    expect(rows[0].includes('mother@test.local'), `the row does not name its creator: ${rows[0].join('|')}`)
  })
  await step('B reloads and sees A\'s expense and the debt', async () => {
    act('B', 'reload')
    await waitFor('A\'s expense on B', () => text('B').includes('میوه و سبزی'), 15000)
    await waitFor('the 225,000 share on B', () => plainDigits(text('B')).includes('225000'), 10000)

    return text('B').match(/شما به مادر بدهکارید|[^ ]+ به شما بدهکار است/)?.[0]
  })
  await step('B adds a 120,000 expense', async () => {
    await expenseVia('B', '120000', 'نان و پنیر')
    const rows = await rowsWhere('هزینه', row => row.includes('نان و پنیر') && row.includes('merchant@test.local'))

    expect(rows.length, "B's row (with his e-mail) is missing on the backend")
  })
  await step('A reloads and sees both expenses; the balance moved', async () => {
    act('A', 'reload')
    await waitFor('B\'s expense on A', () => text('A').includes('نان و پنیر') && text('A').includes('میوه و سبزی'), 15000)
    // B owes A half of 450,000, A owes B half of 120,000: net 165,000 in A's favour.
    await waitFor('the net 165,000 on A', () => plainDigits(text('A')).includes('165000'), 10000)

    return text('A').match(/[^ ]+ به شما بدهکار است/)?.[0]
  })
  for (const who of ['A', 'B']) {
    await step(`${who} sees both members on «اعضا»`, async () => {
      act(who, 'goto', { path: '/shared/members' })
      await waitFor('member list', () => text(who).includes('mother@test.local') && text(who).includes('merchant@test.local'))
      const page = text(who)

      expect(page.includes('مالک') && page.includes('شریک'), 'roles owner/partner are not both shown')

      return who === 'A' ? 'A is «مالک»' : 'B is «شریک»'
    })
  }
  await step('the shared sheet has no personal data, the personal books are separate', async () => {
    const files = await google('/__debug/files')
    const sharedId = (await sharedFile()).id
    const personal = files.filter(file => file.id !== sharedId)

    expect(personal.length === 2, `expected 2 personal books, got ${personal.length}`)
    expect(personal.every(file => file.permissions.length === 1), 'a personal book got shared')
  })
}

async function shutdown() {
  for (const who of ['A', 'B']) {
    try {
      act(who, 'close')
    } catch {
      /* driver already gone */
    }
  }
  await sleep(1500)
  for (const { child } of children) child.kill()
}

let failed = false

try {
  await main()
} catch {
  failed = true
  for (const who of ['A', 'B']) {
    try {
      say(`  screenshot of ${who} at the failure: ${act(who, 'shot', { name: 'failure' }).file}`)
      say(`  ${who} sees: ${text(who).slice(0, 400)}`)
    } catch {
      /* phone already gone */
    }
  }
}
const requests = await google('/__debug/requests?n=500').catch(() => ({ requests: [], unknown: [] }))
const errors = requests.requests.filter(call => call.status >= 400)

say(`\nbackend calls: ${requests.requests.length} shown, ${errors.length} with status >= 400, unknown endpoints: ${requests.unknown.length ? requests.unknown.join('; ') : 'none'}`)
for (const call of errors.slice(0, 10)) say(`  ${call.status} ${call.user} ${call.call.slice(0, 140)}`)
say(`${results.filter(r => r.ok).length}/${results.length} steps passed${failed ? ' (stopped at the first failure)' : ''}`)
if (!args.keep || failed) await shutdown()
else say(`kept running: backend ${backend}, phones A :${ports.A} B :${ports.B} (close with do.mjs <port> close)`)
process.exit(failed ? 1 : 0)
