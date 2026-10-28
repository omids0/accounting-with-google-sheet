// Builders for the module tabs the first fixtures left empty: vehicles, savings goals, the vault,
// timesheets, dang-split groups, net-worth snapshots, recurring items and personal reminders.
// Every row is written the way the app writes it. Where the app exports its serializer it is used
// (goalToRow, timesheetEntryToRow, vaultAssetToRow, netWorthSnapshotToRow, recurringToRow,
// expenseToRow, ...); where it does not (the vehicle tabs, the vault transactions) the column order
// of the app's own private row functions is mirrored and check.mjs checks the shape.
import * as L from './lib.mjs'

const { uid, ago, stamp } = L

const bool = value => (value ? 'TRUE' : 'FALSE')

// ------------------------------------------------------------ vehicles ---

/**
 * One workbook's vehicles. Call the methods in date order: every kilometre reading of a vehicle
 * must be >= the one before (the app never lowers a mileage by itself). Expenses go through the
 * Book, so wallet balance, ledger line and expense row stay one fact.
 *
 * What the app writes for each action (vehicleActions.ts / vehicleExpenseActions.ts):
 *  - service: expense «<type> — <vehicle>» (category خودرو), the service row, a «periodic» history
 *    line, and a «mileage» history line when the reading is new;
 *  - fuel: expense «بنزین — <vehicle>» with the meta row (price per litre, litres, km) and a mileage line;
 *  - mechanic visit: expense «مکانیک — <vehicle>», the visit row and a «mechanic» history line;
 *  - deadline: only its row (no expense); a renewal adds a «deadline» history line.
 */
export function vehicleKit(book, tag) {
  const vehicles = []
  const periodics = new Map()
  const deadlines = []
  const mechanics = []
  const history = []
  const metas = []
  let n = 0

  const nextId = what => uid(`${tag}:veh:${what}:${(n += 1)}`)
  const hist = (v, kind, ref, date, km, nextKm, details, amount, expenseId, time = '10:00', createdOn = date) => {
    history.push([nextId('hist'), v.id, stamp(createdOn, time), kind, ref, date, String(km), String(nextKm), details, String(amount), expenseId])
  }

  /** Raises the vehicle's mileage; returns true when the reading is new (the app then logs it). */
  const raise = (v, date, km) => {
    if (km < v.mileage) throw new Error(`${v.title}: reading ${km} on ${date} is below ${v.mileage}`)

    const isNew = km > v.mileage

    v.mileage = km
    v.lastUpdate = date

    return isNew
  }

  const logMileage = (v, date, km, text, ref = '', time = '10:00') => {
    if (raise(v, date, km)) hist(v, 'mileage', ref, date, km, 0, text, 0, '', time)
  }

  const expense = ({ v, d, title, sub, amount, note, account, counterparty = '', time = '09:30' }) =>
    book.rec({ type: 'expense', date: ago(d), title, category: 'خودرو', sub, amount, account, note, counterparty, time })

  return {
    vehicle(spec) {
      const v = {
        mileage: spec.startKm,
        lastUpdate: spec.since,
        ...spec,
        id: uid(`${tag}:vehicle:${spec.key}`)
      }

      vehicles.push(v)

      return v
    },

    /** «ثبت کارکرد» by hand. */
    reading(v, d, km, time = '09:15') {
      logMileage(v, ago(d), km, `ساعت ${L.fa(time)}`, '', time)
    },

    fuel(v, d, liters, km, account, { price = 5000, time = '08:10', counterparty = '' } = {}) {
      const amount = liters * price
      const rec = expense({ v, d, title: `بنزین — ${v.title}`, sub: 'بنزین', amount, note: '', account, counterparty, time })

      metas.push([
        nextId('meta'),
        rec.id,
        v.id,
        'بنزین',
        String(price),
        String(L.vehExpUtils.calculateFuelLiters(amount, price)),
        String(km),
        stamp(ago(d), time)
      ])
      logMileage(v, ago(d), km, 'هزینه · بنزین', rec.id, time)

      return rec
    },

    /** A periodic service done (again). `historical`: an old one typed in afterwards, no expense and no reading. */
    service(v, s) {
      const { type, d, km, intervalKm, brand = '', location = '', amount = 0, notes = '', account, counterparty = '', time = '10:30', threshold = 500, historical = false } = s
      const date = ago(d)
      const note = [brand, location, notes].filter(Boolean).join(' · ')
      const rec =
        amount > 0 && !historical
          ? expense({ v, d, title: `${type} — ${v.title}`, sub: type, amount, note, account, counterparty, time })
          : null
      const key = `${v.id}|${type}`
      // a service typed in afterwards is created when the user typed it (the day the vehicle was added)
      const row = periodics.get(key) ?? { id: uid(`${tag}:periodic:${v.key}:${type}`), v, type, createdAt: stamp(historical ? v.since : date, time) }

      Object.assign(row, { km, intervalKm, nextKm: km + intervalKm, brand, location, amount, notes, expenseId: rec?.id ?? '', threshold })
      periodics.set(key, row)

      if (!historical) logMileage(v, date, km, `سرویس دوره‌ای · ${type}`, '', time)

      hist(v, 'periodic', row.id, date, km, km + intervalKm, [type, brand, location, notes].filter(Boolean).join(' · '), amount, rec?.id ?? '', time, historical ? v.since : date)

      return rec
    },

    mechanic(v, { d, km, location = '', items, notes = '', amount, account, counterparty = '', time = '11:00' }) {
      const date = ago(d)
      const summary = items.map(i => (i.note ? `${i.category}: ${i.note}` : i.category)).join(' · ')

      logMileage(v, date, km, 'مراجعه به مکانیک', '', time)

      const rec = expense({ v, d, title: `مکانیک — ${v.title}`, sub: 'مکانیک', amount, note: [summary, location, notes].filter(Boolean).join(' · '), account, counterparty, time })
      const visitId = uid(`${tag}:mechanic:${v.key}:${d}`)

      mechanics.push([visitId, v.id, stamp(date, time), date, String(km), location, String(amount), JSON.stringify(items), notes, rec.id])
      hist(v, 'mechanic', visitId, date, km, 0, [summary, location, notes].filter(Boolean).join(' · '), amount, rec.id, time)

      return rec
    },

    /**
     * An insurance / inspection period. `renewals` are earlier periods the user renewed through the
     * app (each leaves a «deadline» history line at the renewal date with the km of that day).
     */
    deadline(v, { category, start, end, amount = 0, notes = '', reminder = true, daysBefore = 7, renewals = [] }) {
      for (const r of renewals) {
        hist(v, 'deadline', uid(`${tag}:deadline:${v.key}:${category}`), r.start, r.km, 0, `${category} · پایان: ${r.end}`, r.amount ?? 0, '', '10:00', v.since)
      }

      deadlines.push([uid(`${tag}:deadline:${v.key}:${category}`), v.id, stamp(v.since, '10:00'), category, start, end, String(amount), notes, '', bool(true), bool(reminder), String(daysBefore)])
    },

    /** Tab name → rows (header first). Call after every action: the profile row holds the final mileage. */
    tabs() {
      const rowOf = v =>
        L.vehProfiles.vehicleRowFromImportCells([
          v.id,
          stamp(v.since, '10:00'),
          v.title,
          v.mileage,
          v.vin ?? '',
          v.year ?? '',
          v.capacity ?? '',
          v.plate ?? '',
          v.interval ?? 'first-of-month',
          v.lastUpdate,
          'TRUE',
          v.mileageRequired ?? ''
        ])

      const periodicRow = p => [
        p.id,
        p.v.id,
        p.createdAt,
        p.type,
        String(p.km),
        String(p.intervalKm),
        String(p.nextKm),
        p.brand,
        p.location,
        String(p.amount),
        p.notes,
        p.expenseId,
        bool(true),
        bool(true),
        String(p.threshold)
      ]

      return {
        [L.names.VEHICLES_SHEET]: [L.heads.VEHICLES_HEADERS, ...vehicles.map(rowOf)],
        [L.names.VEHICLE_PERIODIC_SHEET]: [L.heads.VEHICLE_PERIODIC_HEADERS, ...[...periodics.values()].map(periodicRow)],
        [L.names.VEHICLE_DEADLINE_SHEET]: [L.heads.VEHICLE_DEADLINE_HEADERS, ...deadlines],
        [L.names.VEHICLE_MECHANIC_SHEET]: [L.heads.VEHICLE_MECHANIC_HEADERS, ...mechanics],
        [L.names.VEHICLE_HISTORY_SHEET]: [L.heads.VEHICLE_HISTORY_HEADERS, ...history],
        [L.names.VEHICLE_EXPENSE_META_SHEET]: [L.heads.VEHICLE_EXPENSE_META_HEADERS, ...metas]
      }
    }
  }
}

export const plate = (serial, letter, number, province) => L.plateMod.serializeIranPlate({ province, number, letter, serial })

// -------------------------------------------------------- savings goals ---

/**
 * Savings goals. A deposit is one ledger line on the wallet account (negative delta, source
 * `goal-deposit`, record id = the goal): the account balance drops and the goal's balance rises.
 */
export function goalKit(book, tag) {
  const goals = []

  return {
    goal({ key, title, target, targetDate, account, note = '', status = 'active', since }) {
      const g = { key, title, target, targetDate, account, note, status, since, id: uid(`${tag}:goal:${key}`), balance: 0 }

      goals.push(g)

      return g
    },

    deposit(g, d, amount, account = g.account, time = '14:00') {
      g.balance += amount

      return book.rec({ type: 'expense', ledgerOnly: true, ledgerSource: L.goalsMod.GOAL_LEDGER_SOURCE, recordId: g.id, date: ago(d), title: `واریز به هدف «${g.title}»`, category: '', amount, account, time })
    },

    withdraw(g, d, amount, account = g.account, time = '14:00') {
      g.balance -= amount

      return book.rec({ type: 'income', ledgerOnly: true, ledgerSource: L.goalsMod.GOAL_LEDGER_SOURCE, recordId: g.id, date: ago(d), title: `برداشت از هدف «${g.title}»`, category: '', amount, account, time })
    },

    balanceAt: (g, date) =>
      book.records
        .filter(r => r.ledgerOnly && r.recordId === g.id && r.date <= date)
        .reduce((sum, r) => sum + (r.type === 'expense' ? r.amount : -r.amount), 0),

    total: () => goals.reduce((sum, g) => sum + g.balance, 0),

    rows() {
      return [
        L.heads.TREASURY_GOALS_HEADERS,
        ...goals.map(g =>
          L.goalsMod.goalToRow({ id: g.id, createdAt: stamp(g.since, '10:00'), title: g.title, target: g.target, targetDate: g.targetDate, defaultAccountId: g.account.id, note: g.note, status: g.status })
        )
      ]
    }
  }
}

// ------------------------------------------------------------ the vault ---

/**
 * The vault. Transactions are `[id, createdAt, assetId, buy|sell, quantity, unit price (toman),
 * date, note]`. Prices: a built-in asset (سکه امامی `sekee`, دلار `usd`, نیم سکه `nim`) is priced by
 * tgju unless its catalog row says «manual»; the catalog rows (دارایی_صندوقچه) hold the manual price and
 * its date. Nothing about a purchase touches the wallet.
 */
export function vaultKit(tag) {
  const transactions = []
  const assets = []

  const base = id => L.treasuryCat.BUILTIN_VAULT_ASSETS.find(a => a.id === id)

  return {
    tx(asset, action, quantity, unitPrice, d, note = '', time = '11:00') {
      transactions.push({ id: uid(`${tag}:vault:${transactions.length}:${asset}:${d}`), asset, action, quantity, unitPrice, date: ago(d), note, time })
    },

    /** A built-in asset switched to a manual price (what a user does when tgju is unreachable). */
    manualBuiltin(id, price, d) {
      assets.push({ ...base(id), priceSource: 'manual', manualPrice: price, manualPriceAt: ago(d), active: true })
    },

    /** A user-added asset: always manual, id is a UUID. */
    custom(key, { assetClass, name, symbol, unit, decimals, price, d }) {
      const id = uid(`${tag}:asset:${key}`)

      assets.push({ id, assetClass, symbol, name, unit, decimals, priceSource: 'manual', tgjuKey: '', manualPrice: price, manualPriceAt: ago(d), active: true })

      return id
    },

    /** Quantity held and last known price of each asset at the end of `date` (for net worth). */
    valueAt(date) {
      const held = new Map()
      const last = new Map()

      for (const t of transactions.filter(x => x.date <= date).sort((a, b) => a.date.localeCompare(b.date))) {
        held.set(t.asset, (held.get(t.asset) ?? 0) + (t.action === 'buy' ? t.quantity : -t.quantity))
        last.set(t.asset, t.unitPrice)
      }

      return [...held].reduce((sum, [asset, qty]) => sum + qty * (last.get(asset) ?? 0), 0)
    },

    transactionRows: () => [
      L.heads.TREASURY_HEADERS,
      ...transactions
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(t => [t.id, stamp(t.date, t.time), t.asset, t.action, String(t.quantity), String(t.unitPrice), t.date, t.note])
    ],

    assetRows: () => [L.heads.TREASURY_ASSETS_HEADERS, ...assets.map(L.treasuryCat.vaultAssetToRow)]
  }
}

// ----------------------------------------------------------- timesheets ---

/**
 * Timesheets («تایم‌شیت»). The app has no hourly-rate or money column: the rate lives in the
 * timesheet description and the matching income is an ordinary income record. «تایید شده» marks the
 * entries an invoice already covered.
 */
export function timesheetKit(tag) {
  const sheets = []
  const entries = []

  return {
    sheet({ key, title, description, since }) {
      const s = { key, title, description, since, id: uid(`${tag}:timesheet:${key}`) }

      sheets.push(s)

      return s
    },

    entry(s, d, start, minutes, title, description, checked) {
      const [h, m] = start.split(':').map(Number)
      const end = h * 60 + m + minutes

      if (end >= 24 * 60) throw new Error(`entry on day -${d} crosses midnight`)

      const at = total => `${ago(d)}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`
      const startAt = at(h * 60 + m)
      const endAt = at(end)

      if (L.dateTime.calcDurationMinutes(startAt, endAt) !== minutes) throw new Error(`duration mismatch on day -${d}`)

      entries.push({ sheet: s, id: uid(`${tag}:tsentry:${entries.length}:${d}`), createdAt: stamp(ago(d), '23:10'), title, startAt, endAt, minutes, description, checked })
    },

    minutes: (s, checked) => entries.filter(e => e.sheet === s && (checked === undefined || e.checked === checked)).reduce((sum, e) => sum + e.minutes, 0),

    sheetRows: () => [
      L.heads.TIMESHEETS_HEADERS,
      ...sheets.map(s => L.tsRow.timesheetToRow({ id: s.id, createdAt: stamp(s.since, '10:00'), title: s.title, description: s.description }))
    ],

    entryRows: () => [
      L.heads.TIMESHEET_ENTRIES_HEADERS,
      ...entries.map(e =>
        L.tsRow.timesheetEntryToRow({ id: e.id, timesheetId: e.sheet.id, createdAt: e.createdAt, title: e.title, startAt: e.startAt, endAt: e.endAt, durationMinutes: e.minutes, description: e.description, checked: e.checked })
      )
    ]
  }
}

// ----------------------------------------------------------- dang-split ---

/**
 * One dang-split group: shared expenses split by weights. It is a calculator: nothing posts to the
 * wallet or to the income/expense tabs. Persons are plain names inside the group.
 * `people[].paid` is the cash already settled (negative for the one who got money back).
 */
export function dangSplitGroup(tag, spec) {
  const gid = uid(`${tag}:dsgroup:${spec.key}`)
  const at = stamp(spec.since, '21:00')
  const cats = (spec.categories ?? []).map(c => ({ ...c, id: uid(`${tag}:dscat:${c.key}`) }))
  const people = spec.people.map(p => ({ ...p, id: uid(`${tag}:dsperson:${p.key}`) }))
  const personId = key => people.find(p => p.key === key).id
  const catId = key => cats.find(c => c.key === key)?.id ?? ''

  const expenses = spec.expenses.map(e => ({ ...e, id: uid(`${tag}:dsexp:${e.key}`) }))

  const toPerson = p => ({
    id: p.id,
    groupId: gid,
    name: p.name,
    categoryId: catId(p.cat),
    defaultWeight: p.weight ?? 1,
    deposit: p.deposit ?? 0,
    paidAmount: p.paid ?? 0,
    settledAt: p.settled ? stamp(spec.settledOn ?? spec.since, '12:00') : '',
    note: p.note ?? ''
  })

  const toExpense = e => ({ id: e.id, groupId: gid, title: e.title, date: ago(e.d), amount: e.amount, note: e.note ?? '', createdAt: stamp(ago(e.d), '23:00'), payerId: e.payer ? personId(e.payer) : '' })

  // an expense lists the weights of the people who took part; the default is every person at their own default weight
  const toAllocations = e =>
    Object.entries(e.weights ?? Object.fromEntries(people.map(p => [p.key, p.weight ?? 1]))).map(([key, weight]) => ({
      id: uid(`${tag}:dsalloc:${e.key}:${key}`),
      groupId: gid,
      expenseId: e.id,
      personId: personId(key),
      weight
    }))

  return {
    id: gid,
    people: people.map(toPerson),
    expenses: expenses.map(toExpense),
    allocations: expenses.flatMap(toAllocations),
    categories: cats.map(c => ({ id: c.id, groupId: gid, title: c.title, createdAt: at })),

    tabs() {
      return {
        [L.names.DANG_SPLIT_GROUPS_SHEET]: [L.heads.DANG_SPLIT_GROUPS_HEADERS, [gid, at, spec.title, spec.description ?? '']],
        [L.names.DANG_SPLIT_CATEGORIES_SHEET]: [L.heads.DANG_SPLIT_CATEGORIES_HEADERS, ...this.categories.map(L.dangPeople.categoryToRow)],
        [L.names.DANG_SPLIT_PEOPLE_SHEET]: [L.heads.DANG_SPLIT_PEOPLE_HEADERS, ...this.people.map(L.dangPeople.personToRow)],
        [L.names.DANG_SPLIT_EXPENSES_SHEET]: [L.heads.DANG_SPLIT_EXPENSES_HEADERS, ...this.expenses.map(L.dangExp.expenseToRow)],
        [L.names.DANG_SPLIT_ALLOCATIONS_SHEET]: [L.heads.DANG_SPLIT_ALLOCATIONS_HEADERS, ...this.allocations.map(L.dangExp.allocationToRow)]
      }
    }
  }
}

// ------------------------------------------------------------ the rest ---

/** «دارایی ماهانه» rows. `list`: { month: '1405-07', net, assets, liabilities, source, at: ISO date the row was written }. */
export function netWorthRows(list) {
  return [
    L.heads.NET_WORTH_HEADERS,
    ...list.map(x =>
      L.netWorthMod.netWorthSnapshotToRow({ monthKey: x.month, netWorth: x.assets - x.liabilities, assets: x.assets, liabilities: x.liabilities, recordedAt: stamp(x.at, '08:30'), source: x.source })
    )
  ]
}

/** One «تکرارها» row (a monthly income/expense item). */
export function recurringRowOf(tag, key, r) {
  return L.recurringMod.recurringToRow({
    id: uid(`${tag}:recurring:${key}`),
    createdAt: stamp(r.since ?? ago(60), '10:00'),
    type: r.type,
    category: r.category,
    subCategory: r.sub ?? '',
    accountId: r.account.id,
    amount: r.amount,
    title: r.title,
    dayOfMonth: r.day,
    mode: r.mode ?? 'reminder',
    lastPosted: r.lastPosted,
    active: r.active ?? true,
    ...(r.expenseKind ? { expenseKind: r.expenseKind, payer: r.payer ?? '' } : {})
  })
}

/** One «مواعد_شخصی» row, through the app's own import serializer. */
export function reminderRowOf(tag, key, r) {
  return L.personalRem.personalReminderRowFromImportCells([
    uid(`${tag}:rem:${key}`),
    stamp(r.since ?? ago(30), '09:00'),
    r.category,
    r.title,
    r.due,
    r.recurrence,
    String(r.amount ?? 0),
    String(r.daysBefore ?? 3),
    bool(r.enabled ?? true)
  ])
}

/** Remaining instalments (toman) of plans at the end of `date`: every payment due after it. */
export const remainingAt = (plans, date) => plans.reduce((sum, p) => sum + p.dues.filter(due => due > date).length * p.amount, 0)

/** Person rows for the counterparties tab, extending a list that exists already. */
export const people = (tag, list) => list.map(([key, first, last, phone, note = '']) => L.person(tag, key, first, last, { phones: [phone], note }))
