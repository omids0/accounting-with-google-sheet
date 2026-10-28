// Validates the generated fixtures with the app's own parsers (read-only imports from ../../../src):
//   node --experimental-transform-types docs/user-experience-sessions/data/check.mjs
// Exit code 1 when anything is wrong. Run gen.mjs first.
import { readFileSync } from 'node:fs'

import { checkAreas } from './checkAreas.mjs'
import * as L from './lib.mjs'

const src = path => import(new URL(`../../../src/${path}`, import.meta.url).href)
const load = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'))

const { recordHeaders } = L
const sheetValues = await src('utils/sheetValues.ts')
const parseNumeric = (await src('utils/parseNumeric.ts')).parseNumeric
const bProfile = await src('services/buildingProfile.ts')
const budgets = await src('services/budgets.ts')
const recurring = await src('services/recurring.ts')
const dup = await src('services/recordDuplicates.ts')
const legacy = await src('services/legacyRowLayout.ts')
const attachCol = await src('services/attachmentColumn.ts')
const writerCol = await src('utils/writerColumn.ts')
const smsBalance = await src('services/bankSmsBalance.ts')
const smsReview = await src('services/bankSmsReview.ts')
const chainFile = load('sms-balance-chain.json')

let errors = 0
let warnings = 0

const err = (where, msg) => {
  errors += 1
  console.log(`  ERROR [${where}] ${msg}`)
}

const warn = (where, msg) => {
  warnings += 1
  console.log(`  note  [${where}] ${msg}`)
}

const personas = [
  { name: 'mother', data: 'mother.json', sms: 'sms-mother.json' },
  { name: 'employee', data: 'employee.json', sms: 'sms-employee.json' },
  { name: 'merchant-manager', data: 'merchant-manager.json', sms: 'sms-merchant.json' },
  { name: 'merchant-building', data: 'merchant-building.json', sms: 'sms-merchant-building.json', building: true }
]

const KNOWN_TABS = new Set([...Object.values(L.names).filter(v => typeof v === 'string'), 'درآمد', 'هزینه'])
const idTabs = new Set([L.names.WALLET_SHEET, L.names.WALLET_LEDGER_SHEET, L.names.COUNTERPARTIES_SHEET, L.names.INSTALLMENTS_SHEET, L.names.CHECKS_SHEET, L.names.RECEIVABLES_SHEET, L.names.DANG_SHEET, L.names.RECURRING_SHEET, L.names.PERSONAL_REMINDERS_SHEET, L.names.TIMESHEETS_SHEET, L.names.TIMESHEET_ENTRIES_SHEET, L.names.TREASURY_SHEET, L.names.TREASURY_ASSETS_SHEET, L.names.TREASURY_GOALS_SHEET, L.names.VEHICLES_SHEET, L.names.VEHICLE_PERIODIC_SHEET, L.names.VEHICLE_DEADLINE_SHEET, L.names.VEHICLE_MECHANIC_SHEET, L.names.VEHICLE_HISTORY_SHEET, L.names.VEHICLE_EXPENSE_META_SHEET, L.names.DANG_SPLIT_GROUPS_SHEET, L.names.DANG_SPLIT_CATEGORIES_SHEET, L.names.DANG_SPLIT_PEOPLE_SHEET, L.names.DANG_SPLIT_EXPENSES_SHEET, L.names.DANG_SPLIT_ALLOCATIONS_SHEET, 'درآمد', 'هزینه'])

function dataRows(data, tab) {
  return (data[tab] ?? []).slice(1)
}

for (const p of personas) {
  console.log(`\n== ${p.name}`)

  const data = load(p.data)
  const where = tab => `${p.name}/${tab}`

  // ---- shape
  for (const [tab, rows] of Object.entries(data)) {
    if (!KNOWN_TABS.has(tab)) err(where(tab), 'tab name is not in sheetNames.ts')
    if (!Array.isArray(rows) || !rows.length) err(where(tab), 'empty tab (needs a header row)')
    if (idTabs.has(tab) && rows[0]?.[0] !== 'شناسه') err(where(tab), 'header row must start with «شناسه»')

    rows.forEach((row, i) => {
      if (!Array.isArray(row) || row.some(cell => typeof cell !== 'string')) err(where(tab), `row ${i + 1} has a non-string cell`)
    })
  }

  // ---- headers equal the app's own headers
  const sameHeader = (tab, expected) => {
    if (JSON.stringify(data[tab]?.[0]) !== JSON.stringify(expected)) err(where(tab), 'header differs from the app header')
  }

  sameHeader('درآمد', recordHeaders('income', p.building))
  sameHeader('هزینه', recordHeaders('expense', p.building))
  sameHeader(L.names.WALLET_SHEET, L.heads.WALLET_HEADERS)
  sameHeader(L.names.WALLET_LEDGER_SHEET, L.heads.WALLET_LEDGER_HEADERS)
  if (data[L.names.RECEIVABLES_SHEET]) sameHeader(L.names.RECEIVABLES_SHEET, L.heads.RECEIVABLES_HEADERS)
  if (data[L.names.DANG_SHEET]) sameHeader(L.names.DANG_SHEET, L.heads.DANG_HEADERS)
  if (data[L.names.CHECKS_SHEET]) sameHeader(L.names.CHECKS_SHEET, L.heads.CHECKS_HEADERS)
  if (data[L.names.INSTALLMENTS_SHEET]) sameHeader(L.names.INSTALLMENTS_SHEET, L.heads.INSTALLMENTS_HEADERS)

  // ---- accounts and ledger
  const accounts = dataRows(data, L.names.WALLET_SHEET)
  const accountIds = new Set(accounts.map(r => r[0]))
  const ledger = dataRows(data, L.names.WALLET_LEDGER_SHEET)

  for (const a of accounts) {
    const rows = ledger.filter(r => r[2] === a[0])
    let running = 0

    for (const r of rows) {
      if (r[9] !== 'خیر') running += parseNumeric(r[4])
      if (Math.abs(running - parseNumeric(r[5])) > 0.5) err(where('ledger'), `balance chain breaks for «${a[2]}» at ${r[3]} ${r[6]}`)
    }

    if (Math.abs(running - parseNumeric(a[3])) > 0.5) err(where('wallet'), `«${a[2]}» balance ${a[3]} != ledger ${running}`)
    if (parseNumeric(a[3]) < 0) err(where('wallet'), `«${a[2]}» is negative`)
  }

  // ---- records
  const incomeFields = L.formOf('income', p.building).fields
  const expenseFields = L.formOf('expense', p.building).fields
  const recordIds = new Set()
  const cats = L.catGroups.rowsToGroups(dataRows(data, L.names.CATEGORIES_SHEET))
  let nIncome = 0
  let nExpense = 0
  let sumByAccount = new Map()
  const seenKey = new Map()
  const ledgerEntries = []
  const recordInfo = new Map()

  for (const [tab, fields, kind] of [['درآمد', incomeFields, 'income'], ['هزینه', expenseFields, 'expense']]) {
    const headers = data[tab][0]
    const col = L.sheetsHeaders.buildFieldColumnMap(headers, fields)
    const form = L.formOf(kind, p.building)
    const plan = legacy.legacyLayoutPlan(form, col, writerCol.headerWriterColumn(headers), headers.length, attachCol.headerAttachmentColumn(headers))

    for (const row of dataRows(data, tab)) {
      if (plan && JSON.stringify(legacy.remapLegacyRow(row, plan)) !== JSON.stringify(row)) err(where(tab), 'row would be re-mapped as a legacy layout: ' + row[3])
    }

    for (const row of dataRows(data, tab)) {
      kind === 'income' ? (nIncome += 1) : (nExpense += 1)

      const get = id => row[col.get(id)] ?? ''

      if (recordIds.has(row[0])) err(where(tab), `duplicate id ${row[0]}`)
      recordIds.add(row[0])

      if (!/^\d{4}-\d{2}-\d{2}$/.test(sheetValues.normalizeSheetDate(get('date'))) || get('date').length !== 10) err(where(tab), `bad date ${get('date')}`)
      if (get('date') > L.TODAY) err(where(tab), `date in the future ${get('date')}`)
      if (!(parseNumeric(get('amount')) > 0)) err(where(tab), `bad amount on ${get('title')}`)
      if (!cats[kind].includes(get('category'))) err(where(tab), `category «${get('category')}» is not in the category list (${get('title')})`)
      if (get('walletAccount') && !accountIds.has(get('walletAccount'))) err(where(tab), `unknown account on ${get('title')}`)
      if (dup.parseCreatedAtMs(row[1]) == null) err(where(tab), `createdAt not parseable: ${row[1]}`)

      recordInfo.set(row[0], { kind, date: get('date'), amount: parseNumeric(get('amount')), category: get('category'), sub: get('subCategory'), title: get('title'), account: get('walletAccount'), counterparty: get('counterparty') })
      ledgerEntries.push({ type: kind, amount: parseNumeric(get('amount')), date: get('date'), accountId: get('walletAccount') })

      const key = `${kind}|${get('date')}|${get('title')}|${get('amount')}|${get('walletAccount')}`

      seenKey.set(key, (seenKey.get(key) ?? 0) + 1)

      if (get('walletAccount') && get('walletApply') !== 'خیر') {
        const delta = (kind === 'income' ? 1 : -1) * parseNumeric(get('amount'))

        sumByAccount.set(get('walletAccount'), (sumByAccount.get(get('walletAccount')) ?? 0) + delta)
      }
    }
  }

  // the independent re-derivation: opening + applied records == wallet balance
  for (const a of accounts) {
    const opening = ledger.find(r => r[2] === a[0] && r[7] === 'موجودی اولیه')
    // money moved into / out of a savings goal has a ledger line and no income/expense row
    const goalMoves = ledger.filter(r => r[2] === a[0] && r[7] === 'goal-deposit' && r[9] !== 'خیر').reduce((sum, r) => sum + parseNumeric(r[4]), 0)
    const expected = parseNumeric(opening?.[4]) + (sumByAccount.get(a[0]) ?? 0) + goalMoves

    if (Math.abs(expected - parseNumeric(a[3])) > 0.5) err(where('wallet'), `«${a[2]}»: opening + records = ${expected}, sheet says ${a[3]}`)
  }

  const dupes = [...seenKey].filter(([, n]) => n > 1)

  console.log(`  records: ${nIncome} income, ${nExpense} expense; accounts: ${accounts.map(a => `${a[2]}=${a[3]}`).join(' | ')}`)
  if (dupes.length) console.log(`  deliberate same-day duplicates: ${dupes.map(([k, n]) => `${k.split('|')[2]} x${n}`).join(', ')}`)

  // ---- module tabs
  const needRecord = (tab, id, what) => {
    if (id && !recordIds.has(id)) err(where(tab), `${what} points at a missing record ${id}`)
  }

  const checkDir = data[L.names.CHECKS_SHEET]?.[0].indexOf('نوع چک') ?? -1

  dataRows(data, L.names.CHECKS_SHEET).forEach((row, i) => {
    const c = L.checkRows.rowToCheck(row, i + 2, checkDir)

    if (!(c.amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(c.dueDate)) err(where('checks'), `check ${c.checkNumber} unreadable`)
    if (c.paid) needRecord('checks', c.transactionRecordId, `paid check ${c.checkNumber}`)
    if (c.paid && !c.transactionRecordId) err(where('checks'), `paid check ${c.checkNumber} without record`)
  })

  if (data[L.names.CHECKS_SHEET]) {
    const cs = dataRows(data, L.names.CHECKS_SHEET).map((r, i) => L.checkRows.rowToCheck(r, i + 2, checkDir))
    const open = cs.filter(c => !c.paid)

    console.log(`  checks: ${cs.length} (${cs.filter(c => c.direction === 'received').length} received); open overdue: ${open.filter(c => c.dueDate < L.TODAY).length}, due within 7 days: ${open.filter(c => c.dueDate >= L.TODAY && c.dueDate <= L.ahead(7)).length}`)
  }

  const dangs = dataRows(data, L.names.DANG_SHEET).map((r, i) => L.dangRow.rowToDang(r, i + 2))

  for (const d of dangs) {
    const paidSum = d.payments.reduce((s, x) => s + x.amount, 0)

    if (!(d.amount > 0) || paidSum > d.amount) err(where('debts'), `${d.title}: amount ${d.amount} paid ${paidSum}`)
    d.payments.forEach(x => needRecord('debts', x.transactionRecordId, d.title))
  }

  const recvs = dataRows(data, L.names.RECEIVABLES_SHEET).map((r, i) => L.recvRow.rowToReceivable(r, i + 2))

  for (const r of recvs) {
    const paidSum = r.payments.reduce((s, x) => s + x.amount, 0)

    if (!(r.amount > 0) || paidSum > r.amount) err(where('receivables'), `${r.title}: amount ${r.amount} paid ${paidSum}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.borrowDate)) err(where('receivables'), `${r.title}: bad date ${r.borrowDate}`)
    if (!r.debtor) err(where('receivables'), `${r.title}: no debtor`)
    r.payments.forEach(x => needRecord('receivables', x.transactionRecordId, r.title))
  }

  console.log(`  debts: ${dangs.length}, receivables: ${recvs.length}`)

  dataRows(data, L.names.INSTALLMENTS_SHEET).forEach((row, i) => {
    const plan = L.instCrud.rowToPlan(row, i + 2, 'check')

    if (plan.payments.length !== plan.count) err(where('installments'), `${plan.title}: ${plan.payments.length} payments for count ${plan.count}`)
    plan.payments.filter(x => x.paid).forEach(x => needRecord('installments', x.transactionRecordId, `${plan.title} #${x.n}`))

    const dueNow = plan.payments.filter(x => !x.paid && x.dueDate <= L.TODAY)

    console.log(`  instalment «${plan.title}»: ${plan.payments.filter(x => x.paid).length}/${plan.count} paid, ${dueNow.length} overdue/due today`)
  })

  dataRows(data, L.names.COUNTERPARTIES_SHEET).forEach((row, i) => {
    if (!L.cpMod.rowToCounterparty(row, i + 2)) err(where('counterparties'), `row ${i + 2} unreadable`)
  })

  dataRows(data, L.names.BUDGETS_SHEET).forEach(row => {
    if (!budgets.rowToBudget(row)) err(where('budgets'), `bad budget row ${row[0]}`)
  })

  dataRows(data, L.names.RECURRING_SHEET).forEach(row => {
    if (!recurring.rowToRecurring(row)) err(where('recurring'), `bad recurring row ${row[0]}`)
  })

  dataRows(data, L.names.PERSONAL_REMINDERS_SHEET).forEach(row => {
    if (row.length !== 9 || !/^\d{4}-\d{2}-\d{2}$/.test(row[4])) err(where('reminders'), `bad reminder ${row[3]}`)
  })

  // ---- module tabs: vehicles, goals, vault, timesheets, dang-split, net worth, recurring, reminders, counterparties
  checkAreas({ p, data, accounts, ledger, recordInfo, cats, err, rows: tab => dataRows(data, tab), say: msg => console.log(`  ${msg}`) })

  // ---- building workspace
  if (p.building) {
    const bUnits = L.bUnits.parseUnits(dataRows(data, L.names.BUILDING_UNITS_SHEET))
    const stays = L.bStays.parseStays(dataRows(data, L.names.BUILDING_RESIDENTS_SHEET))
    const persons = dataRows(data, L.names.COUNTERPARTIES_SHEET).map((r, i) => L.cpMod.rowToCounterparty(r, i + 2))
    const profile = bProfile.parseBuildingProfile(data[L.names.BUILDING_SHEET][1])
    const personIds = new Set(persons.map(x => x.id))

    if (!profile) err('building', 'profile row unreadable')
    if (stays.some(s => !personIds.has(s.personId) || !bUnits.some(u => u.id === s.unitId))) err('building', 'stay points at a missing person/unit')

    const refs = new Set()

    for (const r of recvs) {
      if (refs.has(r.reference)) err('building', `duplicate reference ${r.reference}`)
      refs.add(r.reference)
    }

    const recvTypes = ['charge', 'opening', 'credit'].map(k => `${k}:${recvs.filter(r => r.reference?.startsWith(k)).length}`).join(' ')

    const balances = bUnits.map(u => L.bCharges.unitBalance(u.id, recvs, L.bCharges.creditsOf(recvs)))
    const debtors = balances.filter(b => b.open > 0).length

    console.log(`  building: ${bUnits.length} units, ${stays.length} stays, ${persons.length} people; receivables ${recvTypes}; units with open debt: ${debtors}, total open ${balances.reduce((s, b) => s + b.open, 0)}, credits ${L.bCharges.creditsOf(recvs).reduce((s, c) => s + c.amount, 0)}`)

    const role = dataRows(data, L.names.PERIOD_SETTINGS_SHEET).find(r => r[0].startsWith('نقش:'))
    const kind = dataRows(data, L.names.PERIOD_SETTINGS_SHEET).find(r => r[0] === 'نوع فضا')

    if (!role || role[1] !== 'manager' || kind?.[1] !== 'ساختمان') err('building', 'manager role / workspace type row missing')
  }

  // ---- SMS
  const sms = load(p.sms)
  const templates = dataRows(data, L.names.SMS_TEMPLATES_SHEET).map((r, i) => L.smsTemplates.rowToSmsTemplate(r, i + 2))
  const smsAccounts = accounts.map(a => ({ id: a[0], cardNumber: a[7], accountNumber: a[12], iban: a[13] }))
  const tally = {}
  const ids = new Set()
  const now = L.instant(L.TODAY, '23:59')

  templates.forEach((t, i) => {
    if (!t) err(where('templates'), `template row ${i + 2} unreadable`)
    else if (!accountIds.has(t.accountId)) err(where('templates'), `template ${i + 2} has an unknown account`)
    else if (L.smsGuess.validateTemplateParts(t.parts).length) err(where('templates'), `template ${i + 2} is invalid`)
  })

  for (const s of sms) {
    if (ids.has(s.id)) err(p.sms, `duplicate id ${s.id}`)
    ids.add(s.id)

    if (!/^[0-9a-f]{64}$/.test(s.id) || s.source !== 'live') err(p.sms, 'bad id/source')
    if (now - s.receivedAt > 10 * 864e5 || s.receivedAt > now) err(p.sms, `receivedAt outside the last 10 days: ${new Date(s.receivedAt).toISOString()}`)
    if (L.sha256(s.body) !== s.id) tally['salted-id (repeated body)'] = (tally['salted-id (repeated body)'] ?? 0) + 1

    const r = L.smsMatch.matchSms(s.body, templates.filter(Boolean), smsAccounts)
    let label = r.kind === 'matched' ? `matched/${r.direction}` : r.kind

    if (r.kind === 'matched') {
      const candidate = { type: r.direction === 'debit' ? 'expense' : 'income', amount: r.amount / 10, date: L.smsDate.smsRecordDate(s.body, s.receivedAt) }
      const hit = ledgerEntries.some(e => e.accountId === r.accountId && dup.matchesDuplicate(candidate, e, { dayTolerance: 1 }))

      label += hit ? ' (already in books)' : ' (new)'
    }

    tally[label] = (tally[label] ?? 0) + 1
  }

  console.log(`  sms (${sms.length}): ${JSON.stringify(tally)}`)

  // ---- the «مانده» chain: confirming the pending SMS in order must move each balance by exactly the
  // SMS amount (the app writes the SMS «مانده» when it is the newest one), but for the ONE declared
  // deliberate exception per dataset (+1,000,000 toman) that makes the jump notice testable.
  const metaById = new Map((chainFile[p.name] ?? []).map(m => [m.id, m]))
  const reviewed = smsReview.reviewSms(sms, templates.filter(Boolean), smsAccounts, 'toman')
  const matched = reviewed.filter(e => e.result.kind === 'matched' && e.amount !== null)
  const byAccount = new Map()
  const sameDay = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) <= 864e5

  for (const id of metaById.keys()) if (!ids.has(id)) err(p.sms, `chain file names an unknown SMS ${id}`)

  for (const e of matched) {
    if (!metaById.has(e.sms.id)) err(p.sms, `matched SMS ${e.sms.id.slice(0, 8)} has no entry in sms-balance-chain.json`)
    else byAccount.set(e.result.accountId, [...(byAccount.get(e.result.accountId) ?? []), e])
    if (e.balance !== null && e.balance < 0) err(p.sms, `negative «مانده» printed in ${e.sms.id.slice(0, 8)}`)
  }

  let exceptions = 0
  let chained = 0

  for (const [accountId, list] of byAccount) {
    const account = accounts.find(a => a[0] === accountId)
    const name = account[2]
    const wallet = parseNumeric(account[3])
    const ordered = [...list].sort((a, b) => a.sms.receivedAt - b.sms.receivedAt)
    const status = e => metaById.get(e.sms.id).status
    const firstPending = ordered.findIndex(e => status(e) !== 'recorded')

    if (firstPending >= 0 && ordered.slice(firstPending).some(e => status(e) === 'recorded')) err(p.sms, `«${name}»: a recorded SMS is newer than a pending one`)

    const deltaOf = e => (e.result.direction === 'debit' ? -1 : 1) * e.amount
    const pendingOnes = ordered.filter(x => ['pending', 'pending-off'].includes(status(x)))

    // already recorded: «مانده» = what the account's ledger shows right after that very record
    for (const e of ordered.filter(x => status(x) === 'recorded')) {
      const date = L.smsDate.smsRecordDate(e.sms.body, e.sms.receivedAt)
      const line = ledger.find(r => r[2] === accountId && sameDay(r[3], date) && Math.abs(parseNumeric(r[4]) - deltaOf(e)) < 0.5 && Math.abs(parseNumeric(r[5]) - e.balance) < 0.5)

      if (!line) err(p.sms, `«${name}»: recorded SMS ${e.amount} on ${date} prints «مانده» ${e.balance}, no ledger line has that balance right after it`)
    }

    // pending (and re-delivered bodies), oldest first, through the app's own balance rule
    let current = wallet
    let state = {}

    for (const e of ordered.slice(Math.max(firstPending, 0)).filter(x => firstPending >= 0)) {
      const st = status(e)
      const next = smsBalance.nextAccountBalance(current, { receivedAt: e.sms.receivedAt, direction: e.result.direction, amount: e.amount }, e.balance, state)
      const label = `«${name}» ${e.result.direction} ${e.amount} (${e.sms.id.slice(0, 8)})`

      if (!next) {
        err(p.sms, `${label}: the app would ignore it as already included`)
        continue
      }

      const off = st === 'pending-off' ? metaById.get(e.sms.id).offToman : 0
      const expected = current + (st === 'redelivery' ? 0 : deltaOf(e)) + off

      if (st === 'pending-off') {
        exceptions += 1
        console.log(`  deliberate «مانده» exception: ${label} prints ${e.balance} toman, a consistent chain would print ${e.balance - off}`)
      }
      if (Math.abs(next.balance - expected) > 0.5) err(p.sms, `${label}: balance would go ${current} -> ${next.balance}, expected ${expected}`)
      if (st === 'pending' || st === 'pending-off') chained += 1
      if (st === 'pending-off' && (off !== 1000000 || e !== pendingOnes.at(-1))) err(p.sms, `${label}: the deliberate exception must be +1,000,000 and the newest pending SMS of its account`)

      current = next.balance
      state = next.state
    }
  }

  // a body delivered twice: the copy repeats its original's «مانده» (the chain above checks that confirming it does not move the balance)
  for (const e of matched.filter(x => metaById.get(x.sms.id)?.status === 'redelivery')) {
    const original = matched.find(o => o !== e && o.sms.body === e.sms.body)

    if (!original || original.balance !== e.balance || original.sms.receivedAt >= e.sms.receivedAt) err(p.sms, `re-delivered ${e.sms.id.slice(0, 8)} must repeat its original's «مانده» and arrive after it`)
  }

  if (exceptions !== 1) err(p.sms, `expected exactly ONE deliberate «مانده» exception, found ${exceptions}`)
  console.log(`  «مانده» chain: ${chained} pending SMS move their balance by exactly their amount (${exceptions} deliberate +1,000,000 exception)`)

  void warn
}

console.log(`\n${errors ? 'FAILED' : 'OK'}: ${errors} error(s), ${warnings} note(s)`)
process.exit(errors ? 1 : 0)
