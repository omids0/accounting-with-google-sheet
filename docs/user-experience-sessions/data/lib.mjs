// Shared helpers for the fixture generator (gen.mjs) and the checker (check.mjs).
// Run every script in this folder with:  node --experimental-transform-types <script>
// (the app's own TypeScript parsers/serializers are imported read-only from ../../../src).
import { createHash } from 'node:crypto'
import { register } from 'node:module'

const hooks = `
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('.') || specifier.startsWith('/')) && context.parentURL?.includes('/src/')) {
    const p = fileURLToPath(new URL(specifier, context.parentURL))
    for (const cand of [p + '.ts', p + '.tsx', p + '/index.ts', p]) {
      if (existsSync(cand) && statSync(cand).isFile()) return nextResolve(pathToFileURL(cand).href, context)
    }
  }
  return nextResolve(specifier, context)
}
`

register('data:text/javascript,' + encodeURIComponent(hooks), import.meta.url)

const src = path => import(new URL(`../../../src/${path}`, import.meta.url).href)

export const names = await src('services/sheetNames.ts')
export const heads = await src('services/sheetHeaders.ts')
export const sheetsHeaders = await src('services/sheetsHeaders.ts')
export const settingsMod = await src('services/settings.ts')
export const fieldUtils = await src('components/form/fieldUtils.ts')
export const walletMod = await src('services/wallet.ts')
export const dangRow = await src('services/dangRow.ts')
export const recvRow = await src('services/receivablesRow.ts')
export const checkRows = await src('services/checkRows.ts')
export const instCrud = await src('services/installmentsCrud.ts')
export const instSchedule = await src('services/installmentsSchedule.ts')
export const cpMod = await src('services/counterparties.ts')
export const smsGuess = await src('services/bankSmsGuess.ts')
export const smsMatch = await src('services/bankSmsMatch.ts')
export const smsTemplates = await src('services/bankSmsTemplates.ts')
export const smsDate = await src('services/bankSmsDate.ts')
export const catGroups = await src('services/categoryGroups.ts')
export const bTemplateData = await src('services/buildingTemplateData.ts')
export const bUnits = await src('services/buildingUnits.ts')
export const bStays = await src('services/buildingResidents.ts')
export const bCharges = await src('services/buildingCharges.ts')
export const bMonths = await src('services/buildingMonths.ts')
export const bTemplate = await src('services/buildingTemplate.ts')
export const bSplit = await src('services/buildingExpenseSplit.ts')
export const jalali = await src('utils/jalaliDate.ts')
export const jconv = await src('utils/jalaliConvert.ts')
export const goalsMod = await src('services/savingsGoals.ts')
export const treasuryCat = await src('services/treasuryCatalog.ts')
export const treasuryHold = await src('services/treasuryHoldings.ts')
export const tsRow = await src('services/timesheetRow.ts')
export const dateTime = await src('utils/datetime.ts')
export const dangMath = await src('services/dangSplitMath.ts')
export const dangExp = await src('services/dangSplitExpenses.ts')
export const dangPeople = await src('services/dangSplitPeople.ts')
export const netWorthMod = await src('services/netWorth.ts')
export const plateMod = await src('components/vehicles/iranPlateUtils.ts')
export const vehProfiles = await src('services/vehicleProfiles.ts')
export const vehUtils = await src('components/vehicles/utils.ts')
export const recurringMod = await src('services/recurring.ts')
export const personalRem = await src('services/personalReminders.ts')
export const ledgerMod = await src('services/walletLedger.ts')
export const vehExpUtils = await src('utils/vehicleExpenseUtils.ts')

// ---------------------------------------------------------------- time ---

/** The simulated "today" (Gregorian). The app stores ISO Gregorian dates in every cell. */
export const TODAY = '2026-10-27'
const TEHRAN_OFFSET_MIN = 210 // UTC+3:30, no DST since 2022

export function isoAdd(days, base = TODAY) {
  const d = new Date(`${base}T12:00:00Z`)

  d.setUTCDate(d.getUTCDate() + days)

  return d.toISOString().slice(0, 10)
}

export const ago = days => isoAdd(-days)
export const ahead = days => isoAdd(days)

export function instant(isoDate, hhmm = '12:00', sec = 0) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)

  return Date.UTC(y, m - 1, d, h, mi, sec) - TEHRAN_OFFSET_MIN * 60000
}

/** Exactly what the app writes into «زمان ثبت»: `new Date().toLocaleString('fa-IR')` (Jalali, Persian digits). */
export function stamp(isoDate, hhmm = '12:00', sec = 0) {
  return new Date(instant(isoDate, hhmm, sec)).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })
}

export function jalaliOf(isoDate) {
  return jconv.dateToJalali(new Date(`${isoDate}T12:00:00`))
}

export const monthKeyOf = isoDate => {
  const { year, month } = jalaliOf(isoDate)

  return `${year}-${String(month).padStart(2, '0')}`
}

export const jalaliToIso = (y, m, d) => jalali.jalaliToIso(y, m, d)

/** `1405/08/03` style text, for SMS bodies. */
export function jalaliText(isoDate, sep = '/') {
  const { year, month, day } = jalaliOf(isoDate)

  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join(sep)
}

// ----------------------------------------------------------------- ids ---

export function uid(seed) {
  const h = createHash('sha1').update(String(seed)).digest('hex')

  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export const sha256 = text => createHash('sha256').update(text).digest('hex')

// -------------------------------------------------------- record tabs ---

const forms = (building = false) =>
  fieldUtils.withStandardFields(settingsMod.getDefaultForms(), building)

export function formOf(type, building = false) {
  return forms(building).find(f => f.type === type)
}

export function recordHeaders(type, building = false) {
  return sheetsHeaders.buildHeaders(formOf(type, building).fields)
}

export const YES = 'بله'
export const NO = 'خیر'

/**
 * Collects accounts and income/expense records of one workbook, then derives the wallet balances
 * and the «گردش حساب» ledger from them in date order, so every number in the file adds up.
 */
export class Book {
  constructor(tag, anchorDate, building = false) {
    this.tag = tag
    this.anchorDate = anchorDate
    this.building = building
    this.accounts = []
    this.records = []
    this.extraLedger = []
  }

  account(a) {
    const acc = {
      kind: 'بانکی',
      bank: '',
      card: '',
      holder: '',
      acctNo: '',
      note: '',
      opening: 0,
      ...a
    }

    acc.id = uid(`${this.tag}:acct:${acc.key}`)
    acc.createdAt = stamp(this.anchorDate, '09:00')
    this.accounts.push(acc)

    return acc
  }

  /** type: 'income'|'expense'. `account` is an account object (or null = no wallet effect). */
  rec(r) {
    const rec = { sub: '', note: '', counterparty: '', apply: true, time: '12:00', ...r }

    rec.id = uid(`${this.tag}:rec:${this.records.length}:${rec.type}:${rec.date}:${rec.title}`)
    this.records.push(rec)

    return rec
  }

  sorted() {
    return this.records
      .map((r, i) => ({ r, i }))
      .sort((a, b) => a.r.date.localeCompare(b.r.date) || a.r.time.localeCompare(b.r.time) || a.i - b.i)
      .map(x => x.r)
  }

  /** The account's balance (toman) right after the records dated up to `date` `time`. */
  balanceAt(account, date, time = '23:59') {
    let balance = account.opening

    for (const r of this.sorted()) {
      if (`${r.date}${r.time}` > `${date}${time}`) break
      if (r.account !== account || !r.apply) continue

      balance += r.type === 'income' ? r.amount : -r.amount
    }

    return balance
  }

  /** Sum of every account's balance at the end of `date`. */
  walletTotalAt(date) {
    return this.accounts.reduce((sum, a) => sum + this.balanceAt(a, date), 0)
  }

  /**
   * The account's balance right after the record an SMS event stands for: same account, direction
   * and amount, within a day of the event, the nearest in time. Throws when there is none.
   */
  balanceAfterRecord(account, { day, time, toman, delta }) {
    const type = delta > 0 ? 'income' : 'expense'
    const at = instant(day, time)
    let balance = account.opening
    let best = null

    for (const r of this.sorted()) {
      if (r.account !== account || !r.apply) continue

      balance += r.type === 'income' ? r.amount : -r.amount

      const gap = Math.abs(instant(r.date, r.time) - at)

      if (r.type === type && r.amount === toman && gap <= 864e5 && (!best || gap < best.gap)) best = { gap, balance }
    }

    if (!best) throw new Error(`${account.key}: no record for the recorded SMS of ${toman} on ${day}`)

    return best.balance
  }

  build() {
    const balance = new Map(this.accounts.map(a => [a.id, a.opening]))
    const ledger = []

    for (const a of this.accounts) {
      if (a.opening) {
        ledger.push([
          uid(`${this.tag}:ledger:open:${a.key}`),
          stamp(this.anchorDate, '09:00'),
          a.id,
          this.anchorDate,
          String(a.opening),
          String(a.opening),
          'موجودی اولیه حساب',
          'موجودی اولیه',
          '',
          YES
        ])
      }
    }

    const incomeRows = []
    const expenseRows = []
    const incomeHead = recordHeaders('income', this.building)
    const expenseHead = recordHeaders('expense', this.building)
    const incomeFields = formOf('income', this.building).fields
    const expenseFields = formOf('expense', this.building).fields
    let n = 0

    for (const r of this.sorted()) {
      if (r.ledgerOnly) {
        // A wallet movement with no income/expense row (savings-goal deposit): only the ledger line.
        const delta = r.type === 'income' ? r.amount : -r.amount

        balance.set(r.account.id, balance.get(r.account.id) + delta)
        ledger.push([
          uid(`${this.tag}:ledger:${r.id}`),
          stamp(r.date, r.time, n % 50),
          r.account.id,
          r.date,
          String(delta),
          String(balance.get(r.account.id)),
          r.title,
          r.ledgerSource,
          r.recordId ?? '',
          YES
        ])
        n += 1

        continue
      }

      const values = {
        date: r.date,
        title: r.title,
        category: r.category,
        subCategory: r.sub,
        amount: r.amount,
        walletAccount: r.account ? r.account.id : '',
        walletApply: r.account ? (r.apply ? YES : NO) : '',
        counterparty: r.counterparty,
        lineItems: '',
        note: r.note,
        expenseKind: r.kind ?? '',
        split: r.split ?? '',
        payer: r.payer ?? ''
      }

      const createdAt = stamp(r.date, r.time, n % 50)

      n += 1

      const row =
        r.type === 'income'
          ? sheetsHeaders.buildRecordRow(incomeHead, incomeFields, r.id, createdAt, values)
          : sheetsHeaders.buildRecordRow(expenseHead, expenseFields, r.id, createdAt, values)

      ;(r.type === 'income' ? incomeRows : expenseRows).push(row)

      if (r.account) {
        const delta = r.type === 'income' ? r.amount : -r.amount

        if (r.apply) balance.set(r.account.id, balance.get(r.account.id) + delta)

        ledger.push([
          uid(`${this.tag}:ledger:${r.id}`),
          createdAt,
          r.account.id,
          r.date,
          String(delta),
          String(balance.get(r.account.id)),
          r.title || r.category,
          r.ledgerSource ?? 'ثبت',
          r.id,
          r.apply ? YES : NO
        ])
      }
    }

    ledger.push(...this.extraLedger.map(fn => fn(balance)))

    for (const a of this.accounts) a.balance = balance.get(a.id)

    return {
      income: [incomeHead, ...incomeRows],
      expense: [expenseHead, ...expenseRows],
      wallet: [
        heads.WALLET_HEADERS,
        ...this.accounts.map(a =>
          walletMod.accountToRow({
            id: a.id,
            createdAt: a.createdAt,
            title: a.title,
            balance: a.balance,
            note: a.note,
            accountKind: a.kind,
            bankId: a.bank,
            cardNumber: a.card,
            cardHolder: a.holder,
            cardColor: '',
            cardColorPrimary: '',
            cardColorSecondary: '',
            accountNumber: a.acctNo,
            iban: ''
          })
        )
      ],
      ledger: [heads.WALLET_LEDGER_HEADERS, ...ledger]
    }
  }
}

/** Sum of every wallet account's opening balance (the anchor of «موجودی ماهانه»). */
export const openingTotal = book => book.accounts.reduce((s, a) => s + a.opening, 0)

// --------------------------------------------------- misc tab builders ---

export function periodRows(anchorDate, extra = []) {
  const at = stamp(anchorDate, '09:00')

  return [
    heads.PERIOD_SETTINGS_HEADERS,
    ['تاریخ عضویت', anchorDate, at],
    ['ماه شروع محاسبه', monthKeyOf(anchorDate), at],
    ...extra
  ]
}

export function monthlyBalanceRows(anchorDate, amount) {
  return [
    heads.MONTHLY_BALANCE_HEADERS,
    [monthKeyOf(anchorDate), String(amount), stamp(anchorDate, '09:00'), 'ماه شروع محاسبه خودکار']
  ]
}

export function categoryRows(groups, subs = {}) {
  return [heads.CATEGORIES_HEADERS, ...catGroups.groupsToRows(catGroups.withDefaults(groups), subs)]
}

export function emptyGroups() {
  return {
    income: [],
    expense: [],
    dang: [],
    receivable: [],
    personalReminder: [],
    vehiclePeriodic: [],
    vehicleDeadline: [],
    vehicleMechanic: [],
    vehicleExpense: [],
    walletBank: [],
    walletAccountKind: []
  }
}

/** The app's default lists plus the system categories its own payments write under («چک», «بدهی»). */
export function defaultGroups() {
  const before = (list, extra) => [...list.filter(x => x !== 'سایر'), ...extra, 'سایر']

  return {
    ...emptyGroups(),
    income: before(settingsMod.DEFAULT_INCOME_CATEGORIES, ['چک']),
    expense: before(settingsMod.DEFAULT_EXPENSE_CATEGORIES, ['بدهی'])
  }
}

export function budgetRows(list, whenIso) {
  return [
    heads.BUDGETS_HEADERS,
    ...list.map(([category, amount]) => [category, String(amount), stamp(whenIso, '10:00')])
  ]
}

export function personRow(p) {
  const flag = v => (v ? YES : NO)

  return [
    p.id,
    stamp(p.since ?? ago(60), '11:00'),
    p.first,
    p.last ?? '',
    p.birth ?? '',
    p.address ?? '',
    '',
    JSON.stringify((p.phones ?? []).map(number => ({ number }))),
    JSON.stringify(p.accounts ?? []),
    p.note ?? '',
    flag(false),
    flag(p.me)
  ]
}

export function person(tag, key, first, last, extra = {}) {
  return { id: uid(`${tag}:person:${key}`), first, last, ...extra }
}

export const fullName = p => `${p.first} ${p.last ?? ''}`.trim()

// ----------------------------------------------- debts / receivables ---

export function payment(tag, key, amount, paidAt, note = '', transactionRecordId = '') {
  return {
    id: uid(`${tag}:pay:${key}`),
    amount,
    paidAt,
    note,
    ...(transactionRecordId ? { transactionRecordId } : {})
  }
}

export function dangRowOf(tag, key, d) {
  return dangRow.dangToRow({
    id: uid(`${tag}:dang:${key}`),
    createdAt: stamp(d.date, '13:00'),
    title: d.title,
    category: d.category ?? 'سایر',
    subCategory: d.sub ?? '',
    counterparty: d.counterparty,
    amount: d.amount,
    date: d.date,
    note: d.note ?? '',
    paid: false,
    paidAt: '',
    payments: d.payments ?? []
  })
}

export function receivableRowOf(tag, key, r) {
  return recvRow.receivableToRow({
    id: r.id ?? uid(`${tag}:recv:${key}`),
    createdAt: stamp(r.borrowDate, '13:00'),
    title: r.title,
    debtor: r.debtor,
    category: r.category ?? 'سایر',
    subCategory: r.sub ?? '',
    amount: r.amount,
    borrowDate: r.borrowDate,
    note: r.note ?? '',
    payments: r.payments ?? [],
    reference: r.reference ?? '',
    debtorId: r.debtorId ?? ''
  })
}

export function checkRowOf(tag, key, c, directionColumn) {
  return checkRows.checkToRow(
    {
      id: uid(`${tag}:check:${key}`),
      createdAt: stamp(c.creationDate, '10:30'),
      checkNumber: c.number,
      direction: c.direction,
      counterparty: c.counterparty,
      subCategory: c.sub ?? '',
      amount: c.amount,
      creationDate: c.creationDate,
      dueDate: c.dueDate,
      paid: Boolean(c.paid),
      paidAt: c.paidAt ?? '',
      transactionRecordId: c.recordId ?? ''
    },
    directionColumn
  )
}

export const checkId = (tag, key) => uid(`${tag}:check:${key}`)

export function planRowOf(tag, key, p) {
  const id = uid(`${tag}:inst:${key}`)
  const payments = instSchedule.buildPayments(p.count, p.dueDay, p.start, p.amount, p.paidUntil ?? '')

  // Paid installments carry the id of the expense record that paid them.
  for (const pay of payments) {
    const rec = p.records?.[pay.n]

    if (pay.paid && rec) {
      pay.transactionRecordId = rec.id
      pay.paidAt = rec.date
    }
  }

  const plan = {
    id,
    createdAt: stamp(p.start, '12:00'),
    title: p.title,
    subCategory: p.sub ?? '',
    amount: p.amount,
    count: p.count,
    dueDay: p.dueDay,
    startDate: p.start,
    note: p.note ?? '',
    payments
  }

  return { row: instCrud.planToRow(plan), plan }
}

// -------------------------------------------------------------- SMS ---

/**
 * One captured SMS as the native plugin delivers it. The real id is the SHA-256 of the body, so
 * `idSalt` is only used to give a deliberately repeated body a second, distinct id.
 */
export function sms({ sender, body, day, time = '11:00', source = 'live', idSalt = '' }) {
  return {
    id: sha256(body + idSalt),
    sender,
    body,
    receivedAt: instant(day, time),
    source
  }
}

/**
 * Builds the template row the app would save after the user taught it `sample`
 * (the same guessTemplate() the editor starts from).
 */
export function templateRow(tag, key, account, sample, overrides = {}) {
  const guess = smsGuess.guessTemplate(sample)
  const template = {
    id: uid(`${tag}:tpl:${key}`),
    createdAt: stamp(overrides.createdDay ?? ago(40), '09:30'),
    accountId: account.id,
    direction: overrides.direction ?? guess.direction,
    unit: overrides.unit ?? guess.unit,
    parts: guess.parts
  }

  return { row: smsTemplates.smsTemplateToRow(template), template }
}

export const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d])
export const money = n => n.toLocaleString('en-US')

/**
 * The «مانده» (toman) printed in each SMS of one account, as a real bank would produce it, so
 * confirming the pending SMS in the app never makes the balance jump (the app writes the SMS
 * «مانده» when it is the newest one; see `nextAccountBalance`):
 *  - The wallet balance in the data file is the balance after every event that is already
 *    recorded (`recorded: true`). The pending SMS are real transactions it does not include.
 *  - Recorded SMS: the balance the account had right after that event. Other (non-SMS) records move
 *    the same accounts, so this is read from the books' own history (`book.balanceAfterRecord`), which
 *    ends at the wallet balance; check.mjs matches it with the «گردش حساب» line of that record.
 *  - Pending SMS (oldest first): previous «مانده» +/- own amount, starting from the wallet balance.
 *  - Every recorded event must be older than every pending one (otherwise the two timelines
 *    cannot both be true); this throws when a fixture breaks that.
 *  - `deliberateOff` (toman) is added to the «مانده» of the NEWEST pending SMS only: the one
 *    intentional «stale/out-of-order» case that makes the app show its balance-jump notice.
 * Events get `balance` and `status` (`recorded` | `pending` | `pending-off`).
 */
export function chainBalances(book, account, events, { deliberateOff = 0 } = {}) {
  const sorted = [...events].sort((a, b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`))
  const wallet = book.balanceAt(account, TODAY)
  const firstPending = sorted.findIndex(e => !e.recorded)

  if (firstPending >= 0 && sorted.slice(firstPending).some(e => e.recorded)) {
    throw new Error(`${account.key}: a recorded SMS event is newer than a pending one`)
  }

  const recorded = firstPending < 0 ? sorted : sorted.slice(0, firstPending)
  const pending = firstPending < 0 ? [] : sorted.slice(firstPending)

  for (const e of recorded) {
    e.balance = book.balanceAfterRecord(account, e)
    e.status = 'recorded'
  }

  let run = wallet

  pending.forEach((e, i) => {
    run += e.delta
    e.balance = run
    e.status = 'pending'
    if (deliberateOff && i === pending.length - 1) {
      e.balance += deliberateOff
      e.status = 'pending-off'
      e.off = deliberateOff
    }
  })

  return sorted
}

/** What check.mjs needs to know about one SMS: its role in the balance chain. */
export const chainMeta = (smsItem, status, extra = {}) => ({ id: smsItem.id, status, ...extra })
