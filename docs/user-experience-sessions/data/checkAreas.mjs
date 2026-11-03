// Checks for the module tabs (vehicles, goals, vault, timesheets, dang-split, net worth, recurring,
// reminders, counterparties usage). Called from check.mjs once per dataset. Uses the app's own
// parsers wherever they are exported; the vehicle and vault-transaction rows are read by column,
// mirroring the app's private row functions (their column order is the header order).
import * as L from './lib.mjs'

const { parseNumeric } = await import(new URL('../../../src/utils/parseNumeric.ts', import.meta.url).href)
const isoOk = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))
const dtOk = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(String(value ?? ''))
const NOW_MONTH = L.monthKeyOf(L.TODAY)

/** Expected areas per dataset: tab -> minimum data rows. A tab listed here must exist and have at least that many. */
const EXPECT = {
  mother: { vehicles: 1, goals: 2, reminders: 5, recurring: 3, budgets: 7 },
  employee: { vehicles: 1, goals: 1, dangSplitGroups: 1, timesheets: 2, timesheetEntries: 25, netWorth: 5, recurring: 3, reminders: 3, budgets: 6 },
  'merchant-manager': { vehicles: 1, goals: 2, vault: 15, recurring: 4, reminders: 7, netWorth: 4, budgets: 6 },
  'merchant-building': { recurring: 6, budgets: 5 }
}

const TAB = {
  vehicles: L.names.VEHICLES_SHEET,
  goals: L.names.TREASURY_GOALS_SHEET,
  reminders: L.names.PERSONAL_REMINDERS_SHEET,
  recurring: L.names.RECURRING_SHEET,
  budgets: L.names.BUDGETS_SHEET,
  dangSplitGroups: L.names.DANG_SPLIT_GROUPS_SHEET,
  timesheets: L.names.TIMESHEETS_SHEET,
  timesheetEntries: L.names.TIMESHEET_ENTRIES_SHEET,
  netWorth: L.names.NET_WORTH_SHEET,
  vault: L.names.TREASURY_SHEET
}

export function checkAreas({ p, data, accounts, ledger, recordInfo, cats, err, rows, say }) {
  const where = tab => `${p.name}/${tab}`
  const accountIds = new Set(accounts.map(a => a[0]))
  const uniqueIds = (tab, list) => {
    const seen = new Set()

    for (const id of list) {
      if (seen.has(id)) err(where(tab), `duplicate id ${id}`)
      seen.add(id)
    }

    return seen
  }

  const header = (tab, expected) => {
    if (data[tab] && JSON.stringify(data[tab][0]) !== JSON.stringify(expected)) err(where(tab), 'header differs from the app header')
  }

  // ---- what must be filled
  for (const [area, min] of Object.entries(EXPECT[p.name] ?? {})) {
    if (rows(TAB[area]).length < min) err(where(TAB[area]), `expected at least ${min} data rows, found ${rows(TAB[area]).length}`)
  }

  if (p.building) {
    for (const tab of L.names.PERSONAL_ONLY_SHEETS) {
      if (data[tab]) err(where(tab), 'a building workbook must not carry a personal-only tab')
    }
  }

  // ---- vehicles
  if (data[L.names.VEHICLES_SHEET]) checkVehicles()

  function checkVehicles() {
    header(L.names.VEHICLES_SHEET, L.heads.VEHICLES_HEADERS)
    header(L.names.VEHICLE_PERIODIC_SHEET, L.heads.VEHICLE_PERIODIC_HEADERS)
    header(L.names.VEHICLE_DEADLINE_SHEET, L.heads.VEHICLE_DEADLINE_HEADERS)
    header(L.names.VEHICLE_MECHANIC_SHEET, L.heads.VEHICLE_MECHANIC_HEADERS)
    header(L.names.VEHICLE_HISTORY_SHEET, L.heads.VEHICLE_HISTORY_HEADERS)
    header(L.names.VEHICLE_EXPENSE_META_SHEET, L.heads.VEHICLE_EXPENSE_META_HEADERS)

    const vehicles = rows(L.names.VEHICLES_SHEET)
    const vehicleIds = uniqueIds('vehicles', vehicles.map(r => r[0]))
    const periodic = rows(L.names.VEHICLE_PERIODIC_SHEET)
    const deadlines = rows(L.names.VEHICLE_DEADLINE_SHEET)
    const mechanics = rows(L.names.VEHICLE_MECHANIC_SHEET)
    const history = rows(L.names.VEHICLE_HISTORY_SHEET)
    const metas = rows(L.names.VEHICLE_EXPENSE_META_SHEET)

    for (const [tab, list] of [[L.names.VEHICLE_PERIODIC_SHEET, periodic], [L.names.VEHICLE_DEADLINE_SHEET, deadlines], [L.names.VEHICLE_MECHANIC_SHEET, mechanics], [L.names.VEHICLE_HISTORY_SHEET, history], [L.names.VEHICLE_EXPENSE_META_SHEET, metas]]) {
      uniqueIds(tab, list.map(r => r[0]))
    }

    const linked = new Set()
    const expenseOf = (tab, id, what, amount) => {
      if (!id) return

      linked.add(id)

      const rec = recordInfo.get(id)

      if (!rec) return err(where(tab), `${what} points at a missing expense ${id}`)
      if (rec.kind !== 'expense' || rec.category !== 'خودرو') err(where(tab), `${what}: the linked record is not a «خودرو» expense`)
      if (amount !== undefined && Math.abs(rec.amount - amount) > 0.5) err(where(tab), `${what}: amount ${amount} != expense ${rec.amount}`)

      return rec
    }

    for (const r of vehicles) {
      if (JSON.stringify(L.vehProfiles.vehicleRowFromImportCells(r)) !== JSON.stringify(r)) err(where('vehicles'), `row of «${r[2]}» does not survive the app's own serializer`)
      if (!isoOk(r[9])) err(where('vehicles'), `bad last-update date ${r[9]}`)
      if (!L.plateMod.isStructuredIranPlate(r[7])) err(where('vehicles'), `plate of «${r[2]}» is not in the structured format`)
    }

    for (const r of periodic) {
      const [km, interval, next] = [parseNumeric(r[4]), parseNumeric(r[5]), parseNumeric(r[6])]

      if (!vehicleIds.has(r[1])) err(where('periodic'), `service «${r[3]}» points at an unknown vehicle`)
      if (next !== km + interval) err(where('periodic'), `service «${r[3]}»: next ${next} != ${km} + ${interval}`)
      if (!['TRUE', 'FALSE'].includes(r[12]) || !['TRUE', 'FALSE'].includes(r[13])) err(where('periodic'), `service «${r[3]}»: flags must be TRUE/FALSE`)
      expenseOf('periodic', r[11], `service «${r[3]}»`, parseNumeric(r[9]))
    }

    for (const r of deadlines) {
      if (!vehicleIds.has(r[1])) err(where('deadlines'), `deadline «${r[3]}» points at an unknown vehicle`)
      if (!isoOk(r[4]) || !isoOk(r[5]) || r[5] < r[4]) err(where('deadlines'), `deadline «${r[3]}» has bad dates ${r[4]} .. ${r[5]}`)
      if (!['0', '1', '2', '3', '7'].includes(r[11])) err(where('deadlines'), `deadline «${r[3]}»: days-before ${r[11]} is not one of the form's options`)
    }

    for (const r of mechanics) {
      let items = []

      try {
        items = JSON.parse(r[7])
      } catch {
        err(where('mechanic'), 'items are not JSON')
      }

      if (!vehicleIds.has(r[1]) || !Array.isArray(items) || !items.length || !isoOk(r[3])) err(where('mechanic'), `bad visit row ${r[0]}`)
      expenseOf('mechanic', r[9], 'mechanic visit', parseNumeric(r[6]))
    }

    for (const r of metas) {
      const [price, liters, km, rec] = [parseNumeric(r[4]), parseNumeric(r[5]), parseNumeric(r[6]), recordInfo.get(r[1])]

      if (!vehicleIds.has(r[2])) err(where('expense-meta'), 'meta points at an unknown vehicle')
      if (!rec) err(where('expense-meta'), `meta ${r[0]} points at a missing expense`)
      else {
        linked.add(r[1])
        if (rec.sub !== r[3]) err(where('expense-meta'), `type «${r[3]}» != expense sub-category «${rec.sub}»`)
        if (r[3] === 'بنزین' && Math.abs(price * liters - rec.amount) > 1) err(where('expense-meta'), `fuel: ${price} x ${liters} != ${rec.amount}`)
      }
      if (r[3] === 'بنزین' && !(km > 0)) err(where('expense-meta'), 'a fuel entry needs its mileage (the vehicles in this fixture require it)')
    }

    for (const r of history) {
      if (!vehicleIds.has(r[1])) err(where('history'), `line ${r[0]} points at an unknown vehicle`)
      if (!['periodic', 'deadline', 'mechanic', 'mileage'].includes(r[3])) err(where('history'), `bad kind ${r[3]}`)
      if (!isoOk(r[5]) || r[5] > L.TODAY) err(where('history'), `bad date ${r[5]}`)
      if (r[10]) expenseOf('history', r[10], `history ${r[3]}`, parseNumeric(r[9]))
    }

    // every «خودرو» expense belongs to a service, a visit or a fuel meta row
    for (const [id, rec] of recordInfo) {
      if (rec.kind === 'expense' && rec.category === 'خودرو' && !linked.has(id)) err(where('vehicles'), `expense «${rec.title}» on ${rec.date} is not linked to any vehicle row`)
    }

    // mileage never goes down with the date (historical lines are older and lower, which is fine)
    const dateOfMeta = new Map(metas.map(r => [r[0], recordInfo.get(r[1])?.date ?? '']))

    for (const v of vehicles) {
      const events = [
        ...history.filter(r => r[1] === v[0] && parseNumeric(r[6]) > 0).map(r => ({ date: r[5], km: parseNumeric(r[6]), what: `history ${r[3]}` })),
        ...metas.filter(r => r[2] === v[0] && parseNumeric(r[6]) > 0).map(r => ({ date: dateOfMeta.get(r[0]), km: parseNumeric(r[6]), what: 'fuel' }))
      ].sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km)

      events.reduce((prev, e) => {
        if (e.km < prev.km) err(where('vehicles'), `«${v[2]}»: mileage ${e.km} on ${e.date} (${e.what}) is below ${prev.km} on ${prev.date}`)

        return e
      }, events[0])

      const max = Math.max(...events.map(e => e.km))

      if (parseNumeric(v[3]) !== max) err(where('vehicles'), `«${v[2]}»: profile mileage ${v[3]} != highest reading ${max}`)

      const latest = events.filter(e => e.what === 'history mileage' || e.what === 'fuel').at(-1)

      if (latest && v[9] !== latest.date) err(where('vehicles'), `«${v[2]}»: last mileage update ${v[9]} != latest reading date ${latest.date}`)

      const mileage = parseNumeric(v[3])
      const overdueKm = periodic.filter(r => r[1] === v[0] && parseNumeric(r[6]) < mileage).map(r => `${r[3]} (${mileage - parseNumeric(r[6])} km)`)
      const soonKm = periodic.filter(r => r[1] === v[0] && parseNumeric(r[6]) >= mileage && parseNumeric(r[6]) - mileage <= 500).map(r => r[3])
      const dl = deadlines.filter(r => r[1] === v[0]).map(r => `${r[3]} ${r[5] < L.TODAY ? 'OVERDUE' : `in ${Math.round((Date.parse(r[5]) - Date.parse(L.TODAY)) / 864e5)}d`}`)

      say(`vehicle «${v[2]}»: ${mileage} km, ${periodic.filter(r => r[1] === v[0]).length} services (overdue by km: ${overdueKm.join(', ') || 'none'}; within 500 km: ${soonKm.join(', ') || 'none'}), ${metas.filter(r => r[2] === v[0]).length} fuel/expense metas, ${mechanics.filter(r => r[1] === v[0]).length} mechanic visits, deadlines: ${dl.join(', ')}`)
    }
  }

  // ---- savings goals (money lives in the ledger)
  if (data[L.names.TREASURY_GOALS_SHEET]) {
    header(L.names.TREASURY_GOALS_SHEET, L.heads.TREASURY_GOALS_HEADERS)

    const goals = rows(L.names.TREASURY_GOALS_SHEET).map(r => ({ row: r, goal: L.goalsMod.rowToGoal(r) }))

    uniqueIds('goals', goals.map(x => x.row[0]))

    const entries = ledger.map(L.ledgerMod.rowToLedgerEntry)
    const balances = L.goalsMod.goalBalances(entries)

    for (const e of entries.filter(x => x.source === L.goalsMod.GOAL_LEDGER_SOURCE)) {
      if (!goals.some(x => x.goal?.id === e.recordId)) err(where('goals'), `ledger line «${e.title}» points at an unknown goal`)
      if (e.delta === 0 || !accountIds.has(e.accountId)) err(where('goals'), `ledger line «${e.title}» has no amount or account`)
      if (e.date > L.TODAY) err(where('goals'), `deposit in the future: ${e.date}`)
    }

    for (const { goal, row } of goals) {
      if (!goal) {
        err(where('goals'), `row ${row[0]} unreadable`)
        continue
      }

      const balance = balances.get(goal.id) ?? 0

      if (!(goal.target > 0) || balance < 0) err(where('goals'), `«${goal.title}»: target ${goal.target}, balance ${balance}`)
      if (goal.targetDate && !isoOk(goal.targetDate)) err(where('goals'), `«${goal.title}»: bad target date`)
      if (goal.defaultAccountId && !accountIds.has(goal.defaultAccountId)) err(where('goals'), `«${goal.title}»: unknown default account`)
      if (balance > goal.target) err(where('goals'), `«${goal.title}»: deposits ${balance} exceed the target ${goal.target}`)
      if (L.goalsMod.nextGoalStatus(goal, balance) !== goal.status) err(where('goals'), `«${goal.title}»: status «${goal.status}» does not match balance ${balance} of ${goal.target}`)

      const months = L.goalsMod.monthsUntil(L.TODAY, goal.targetDate)

      say(`goal «${goal.title}»: ${balance}/${goal.target} (${goal.status}), ${months} month(s) to ${goal.targetDate || 'no date'}${goal.targetDate && goal.targetDate < L.TODAY && goal.status !== 'reached' ? ' — PAST ITS DATE, not reached' : ''}`)
    }
  }

  // ---- vault
  if (data[L.names.TREASURY_SHEET]) {
    header(L.names.TREASURY_SHEET, L.heads.TREASURY_HEADERS)
    header(L.names.TREASURY_ASSETS_SHEET, L.heads.TREASURY_ASSETS_HEADERS)

    const assetRows = rows(L.names.TREASURY_ASSETS_SHEET)
    const assets = assetRows.map(r => L.treasuryCat.rowToVaultAsset(r))

    uniqueIds('vault-assets', assetRows.map(r => r[0]))
    assets.forEach((a, i) => {
      if (!a) return err(where('vault-assets'), `row ${i + 2} unreadable`)
      if (JSON.stringify(L.treasuryCat.vaultAssetToRow(a)) !== JSON.stringify(assetRows[i])) err(where('vault-assets'), `«${a.name}» does not survive the app's own serializer`)
      if (a.priceSource === 'manual' && !(a.manualPrice > 0 && isoOk(a.manualPriceAt))) err(where('vault-assets'), `«${a.name}»: manual price/date missing`)
    })

    const catalog = L.treasuryCat.mergeVaultCatalog(assets.filter(Boolean))
    const known = new Set(catalog.map(a => a.id))
    const txRows = rows(L.names.TREASURY_SHEET)
    const txs = txRows.map(r => ({ id: r[0], createdAt: r[1], assetType: L.treasuryCat.normalizeAssetId(r[2]), action: r[3], quantity: parseNumeric(r[4]), unitPrice: parseNumeric(r[5]), transactionDate: r[6], note: r[7] }))

    uniqueIds('vault', txRows.map(r => r[0]))

    for (const t of txs) {
      if (!known.has(t.assetType)) err(where('vault'), `transaction ${t.id.slice(0, 8)} names an asset outside the catalog: ${t.assetType}`)
      if (!['buy', 'sell'].includes(t.action) || !(t.quantity > 0) || !(t.unitPrice > 0)) err(where('vault'), `transaction ${t.id.slice(0, 8)} has bad action/quantity/price`)
      if (!isoOk(t.transactionDate) || t.transactionDate > L.TODAY) err(where('vault'), `bad date ${t.transactionDate}`)
    }

    const running = new Map()

    for (const t of [...txs].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))) {
      const qty = (running.get(t.assetType) ?? 0) + (t.action === 'buy' ? t.quantity : -t.quantity)

      if (qty < 0) err(where('vault'), `sold more ${t.assetType} than held on ${t.transactionDate}`)
      running.set(t.assetType, qty)
    }

    // tgju answers nothing in the mock: only manually priced assets get a value
    const holdings = L.treasuryHold.computeHoldings(txs, {}, catalog)
    const unpriced = holdings.filter(h => h.currentUnitPrice === 0).map(h => h.asset.name)
    const stale = catalog.filter(a => a.priceSource === 'manual' && L.treasuryCat.isManualPriceStale(a, L.TODAY)).map(a => a.name)

    say(`vault: ${txs.length} transactions, ${holdings.length} holdings (${holdings.map(h => `${h.asset.name} ${h.netQuantity}`).join(', ')}); value with tgju = {}: ${Math.round(holdings.reduce((s, h) => s + h.totalValue, 0))}; no price at all: ${unpriced.join(', ') || 'none'}; stale manual price: ${stale.join(', ') || 'none'}`)
  }

  // ---- timesheets
  if (data[L.names.TIMESHEETS_SHEET]) {
    header(L.names.TIMESHEETS_SHEET, L.heads.TIMESHEETS_HEADERS)
    header(L.names.TIMESHEET_ENTRIES_SHEET, L.heads.TIMESHEET_ENTRIES_HEADERS)

    const sheets = rows(L.names.TIMESHEETS_SHEET).map((r, i) => L.tsRow.rowToTimesheet(r, i + 2))
    const entryRows = rows(L.names.TIMESHEET_ENTRIES_SHEET)
    const sheetIds = uniqueIds('timesheets', sheets.map(s => s.id))

    uniqueIds('timesheet-entries', entryRows.map(r => r[0]))

    const entries = entryRows.map((r, i) => L.tsRow.rowToTimesheetEntry(r, i + 2))
    const byStart = [...entries].sort((a, b) => a.startAt.localeCompare(b.startAt))

    byStart.forEach((e, i) => {
      if (!sheetIds.has(e.timesheetId)) err(where('timesheet-entries'), `«${e.title}» points at an unknown timesheet`)
      if (!dtOk(e.startAt) || !dtOk(e.endAt) || e.endAt <= e.startAt) err(where('timesheet-entries'), `«${e.title}»: bad times ${e.startAt} .. ${e.endAt}`)
      if (e.startAt.slice(0, 10) !== e.endAt.slice(0, 10)) err(where('timesheet-entries'), `«${e.title}» crosses midnight`)
      if (e.startAt.slice(0, 10) > L.TODAY) err(where('timesheet-entries'), `«${e.title}» is in the future`)
      if (e.durationMinutes !== L.dateTime.calcDurationMinutes(e.startAt, e.endAt)) err(where('timesheet-entries'), `«${e.title}»: duration ${e.durationMinutes} != start..end`)
      if (i && e.startAt < byStart[i - 1].endAt) err(where('timesheet-entries'), `«${e.title}» overlaps «${byStart[i - 1].title}»`)
    })

    for (const s of sheets) {
      const mine = entries.filter(e => e.timesheetId === s.id)
      const checked = mine.filter(e => e.checked)

      say(`timesheet «${s.title}» (${s.description}): ${mine.length} entries, ${L.tsRow.totalDurationMinutes(mine) / 60} h, ${L.tsRow.totalDurationMinutes(checked) / 60} h approved`)
    }
  }

  // ---- dang-split
  if (data[L.names.DANG_SPLIT_GROUPS_SHEET]) checkDangSplit()

  function checkDangSplit() {
    for (const [tab, head] of [[L.names.DANG_SPLIT_GROUPS_SHEET, L.heads.DANG_SPLIT_GROUPS_HEADERS], [L.names.DANG_SPLIT_CATEGORIES_SHEET, L.heads.DANG_SPLIT_CATEGORIES_HEADERS], [L.names.DANG_SPLIT_PEOPLE_SHEET, L.heads.DANG_SPLIT_PEOPLE_HEADERS], [L.names.DANG_SPLIT_EXPENSES_SHEET, L.heads.DANG_SPLIT_EXPENSES_HEADERS], [L.names.DANG_SPLIT_ALLOCATIONS_SHEET, L.heads.DANG_SPLIT_ALLOCATIONS_HEADERS]]) {
      header(tab, head)
      uniqueIds(tab, rows(tab).map(r => r[0]))
    }

    const groups = rows(L.names.DANG_SPLIT_GROUPS_SHEET)
    const catRows = rows(L.names.DANG_SPLIT_CATEGORIES_SHEET)
    const peopleRows = rows(L.names.DANG_SPLIT_PEOPLE_SHEET)
    const expenseRows = rows(L.names.DANG_SPLIT_EXPENSES_SHEET)
    const allocRows = rows(L.names.DANG_SPLIT_ALLOCATIONS_SHEET)
    const asPerson = r => ({ id: r[0], groupId: r[1], name: r[2], categoryId: r[3], defaultWeight: parseNumeric(r[4]) || 1, paidAmount: parseNumeric(r[5]), settledAt: r[6], note: r[7], deposit: parseNumeric(r[8]) })
    const asExpense = r => ({ id: r[0], groupId: r[1], title: r[2], date: r[3], amount: parseNumeric(r[4]), note: r[5], createdAt: r[6], payerId: r[7] })
    const asAlloc = r => ({ id: r[0], groupId: r[1], expenseId: r[2], personId: r[3], weight: parseNumeric(r[4]) })

    for (const g of groups) {
      const gid = g[0]
      const people = peopleRows.filter(r => r[1] === gid).map(asPerson)
      const expenses = expenseRows.filter(r => r[1] === gid).map(asExpense)
      const allocations = allocRows.filter(r => r[1] === gid).map(asAlloc)
      const personIds = new Set(people.map(x => x.id))
      const catIds = new Set(catRows.filter(r => r[1] === gid).map(r => r[0]))

      for (const x of people) {
        if (x.categoryId && !catIds.has(x.categoryId)) err(where('dang-split'), `«${x.name}» points at an unknown person category`)
      }
      for (const e of expenses) {
        if (!(e.amount > 0) || !isoOk(e.date) || e.date > L.TODAY) err(where('dang-split'), `expense «${e.title}»: bad amount/date`)
        if (e.payerId && !personIds.has(e.payerId)) err(where('dang-split'), `expense «${e.title}»: payer is not in the group`)
        if (!allocations.some(a => a.expenseId === e.id)) err(where('dang-split'), `expense «${e.title}» has no allocation`)
      }
      for (const a of allocations) {
        if (!personIds.has(a.personId) || !expenses.some(e => e.id === a.expenseId) || !(a.weight > 0)) err(where('dang-split'), `allocation ${a.id.slice(0, 8)} is broken`)
      }

      // every expense: the shares add up to the amount exactly (the remainder goes to the largest weight)
      let remainders = 0

      for (const e of expenses) {
        const weights = allocations.filter(a => a.expenseId === e.id).map(a => ({ personId: a.personId, weight: a.weight }))
        const shares = L.dangMath.splitExpenseShares(e.amount, weights)
        const sum = [...shares.values()].reduce((s, v) => s + v, 0)
        const total = weights.reduce((s, w) => s + w.weight, 0)
        const floored = weights.reduce((s, w) => s + Math.floor((e.amount * w.weight) / total), 0)

        if (sum !== e.amount) err(where('dang-split'), `expense «${e.title}»: shares ${sum} != ${e.amount}`)
        if (floored !== e.amount) remainders += 1
      }

      const summary = L.dangMath.buildGroupSummary({ people, expenses, allocations })
      const sumPaid = people.reduce((s, x) => s + x.paidAmount, 0)

      if (summary.total !== expenses.reduce((s, e) => s + e.amount, 0)) err(where('dang-split'), 'group total differs from the expenses')
      if (Math.abs(summary.people.reduce((s, x) => s + x.share, 0) - summary.total) > 0.5) err(where('dang-split'), 'shares do not add up to the group total')
      if (sumPaid !== 0) err(where('dang-split'), `cash settlements must net to zero, got ${sumPaid}`)
      if (Math.abs(summary.balance + summary.depositTotal) > 0.5) err(where('dang-split'), `balances ${summary.balance} should equal minus the fund deposits ${summary.depositTotal}`)

      for (const s of summary.people) {
        const person = people.find(x => x.id === s.personId)
        const due = s.share - s.credit
        const settled = due === 0 ? s.paid === 0 : due > 0 ? s.paid >= due : s.paid <= due

        if (Boolean(person.settledAt) !== settled) err(where('dang-split'), `«${s.name}»: settled flag does not follow the app's rule (due ${due}, paid ${s.paid})`)
      }

      say(`dang-split «${g[2]}»: ${people.length} people, ${expenses.length} expenses (${remainders} with a rounding remainder), total ${summary.total}; ${summary.people.map(s => `${s.name}: ${s.status} ${s.balance}`).join(' | ')}`)
    }
  }

  // ---- net worth
  if (data[L.names.NET_WORTH_SHEET]) {
    header(L.names.NET_WORTH_SHEET, L.heads.NET_WORTH_HEADERS)

    const snaps = rows(L.names.NET_WORTH_SHEET).map(L.netWorthMod.rowToNetWorthSnapshot)

    uniqueIds('net-worth', rows(L.names.NET_WORTH_SHEET).map(r => r[0]))

    for (const s of snaps) {
      if (!s) {
        err(where('net-worth'), 'unreadable row')
        continue
      }

      if (s.monthKey >= NOW_MONTH) err(where('net-worth'), `${s.monthKey} is not a past month`)
      if (Math.abs(s.assets - s.liabilities - s.netWorth) > 0.5) err(where('net-worth'), `${s.monthKey}: assets - liabilities != net worth`)
    }

    const months = snaps.filter(Boolean).map(s => s.monthKey).sort()

    say(`net worth: ${months.join(', ')}${months.includes(L.monthKeyOf(L.isoAdd(-30))) ? '' : ` — last month (${L.monthKeyOf(L.isoAdd(-30))}) has no row: the app writes it on first open`}`)
  }

  // ---- recurring items and personal reminders
  const recurring = rows(L.names.RECURRING_SHEET).map(L.recurringMod.rowToRecurring)
  const typeKey = { income: 'income', expense: 'expense' }

  uniqueIds('recurring', rows(L.names.RECURRING_SHEET).map(r => r[0]))
  recurring.forEach(item => {
    if (!item) return err(where('recurring'), 'unreadable row')
    if (item.accountId && !accountIds.has(item.accountId)) err(where('recurring'), `«${item.title}»: unknown account`)
    if (!cats[typeKey[item.type]].includes(item.category)) err(where('recurring'), `«${item.title}»: category «${item.category}» is not in the category list`)
    if (item.lastPosted > NOW_MONTH) err(where('recurring'), `«${item.title}»: lastPosted ${item.lastPosted} is in the future`)
  })

  const pending = L.recurringMod.pendingReminders(recurring.filter(Boolean), L.TODAY)

  if (recurring.length) say(`recurring: ${recurring.length} items, ${pending.length} waiting for ${NOW_MONTH}: ${pending.map(x => x.title).join(', ') || 'none'}`)

  const reminderRows = rows(L.names.PERSONAL_REMINDERS_SHEET)

  uniqueIds('reminders', reminderRows.map(r => r[0]))

  for (const r of reminderRows) {
    if (JSON.stringify(L.personalRem.personalReminderRowFromImportCells(r)) !== JSON.stringify(r)) err(where('reminders'), `«${r[3]}» does not survive the app's own serializer`)
    if (!cats.personalReminder.includes(r[2])) err(where('reminders'), `«${r[3]}»: category «${r[2]}» is not in the reminder categories`)
    if (!['none', 'monthly', 'yearly'].includes(r[5]) || !['0', '1', '2', '3', '7'].includes(r[7])) err(where('reminders'), `«${r[3]}»: bad recurrence/days-before`)
  }

  if (reminderRows.length) {
    say(`reminders: ${reminderRows.length} (overdue ${reminderRows.filter(r => r[4] < L.TODAY && r[8] === 'TRUE').length}, off ${reminderRows.filter(r => r[8] !== 'TRUE').length})`)
  }

  // ---- budgets: every budgeted category must be an expense category of the workbook
  for (const r of rows(L.names.BUDGETS_SHEET)) {
    if (!cats.expense.includes(r[0])) err(where('budgets'), `budget for «${r[0]}», which is not an expense category`)
  }

  // ---- counterparties: every name used in a record exists in the tab; report who is never used
  const people = rows(L.names.COUNTERPARTIES_SHEET).map((r, i) => L.cpMod.rowToCounterparty(r, i + 2)).filter(Boolean)
  const names = new Set(people.map(x => L.fullName({ first: x.firstName, last: x.lastName })))
  const used = new Set()

  for (const rec of recordInfo.values()) {
    if (!rec.counterparty) continue
    used.add(rec.counterparty)
    if (!names.has(rec.counterparty)) err(where('counterparties'), `record «${rec.title}» names «${rec.counterparty}», who is not in the counterparties tab`)
  }

  const checkRowsList = rows(L.names.CHECKS_SHEET)
  const dangRowsList = rows(L.names.DANG_SHEET)
  const recvRowsList = rows(L.names.RECEIVABLES_SHEET)

  checkRowsList.forEach(r => used.add(r[3]))
  dangRowsList.forEach(r => used.add(r[4]))
  recvRowsList.forEach(r => used.add(r[3]))

  if (people.length) say(`counterparties: ${people.length}, used by records/checks/debts/receivables: ${[...names].filter(n => used.has(n)).length}`)
}
