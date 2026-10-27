import { describe, expect, it } from 'vitest'

import { DEFAULT_MANAGED_LISTS } from './buildingLists'
import {
  collectionByMonth,
  collectionFlow,
  collectionRate,
  debtorTable,
  fundBalanceSeries,
  openDebts,
  periodChoices,
  periodFlow,
  periodWindow
} from './buildingReports'
import { newStay } from './buildingResidents'
import { newUnit } from './buildingUnits'
import type { LedgerEntry } from './walletLedger'
import { buildUnitRows } from '../components/buildings/unitRows'
import type { Counterparty, Dang, Receivable, RecordRow } from '../types'

const person = (id: string, lastName: string): Counterparty & { rowNumber: number } => ({
  id,
  createdAt: '',
  firstName: '',
  lastName,
  birthDate: '',
  address: '',
  location: null,
  phones: [],
  accounts: [],
  note: '',
  rowNumber: 2
})

const unitA = { ...newUnit({ number: '1', floor: 1, area: 100 }), rowNumber: 2 }

const unitB = { ...newUnit({ number: '2', floor: 1, area: 100 }), rowNumber: 3 }

const stays = [
  { ...newStay({ unitId: unitA.id, personId: 'p1', role: 'owner' }), rowNumber: 2 },
  { ...newStay({ unitId: unitB.id, personId: 'p2', role: 'owner' }), rowNumber: 3 }
]

const persons = [person('p1', 'موسوی'), person('p2', 'کاظمی')]

const receivable = (reference: string, amount: number, paid = 0): Receivable => ({
  id: reference,
  createdAt: '۱۴۰۵/۶/۱،۱۰:۰۰',
  title: reference,
  debtor: '',
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-09-01',
  note: '',
  payments: paid ? [{ id: `${reference}-pay`, amount: paid, paidAt: '2026-09-05', note: '' }] : [],
  reference
})

const receivables = [
  receivable(`charge:${unitA.id}:1405-06`, 1_000_000, 1_000_000),
  receivable(`charge:${unitB.id}:1405-06`, 1_000_000),
  receivable(`charge:${unitA.id}:1405-07`, 1_000_000),
  receivable(`charge:${unitB.id}:1405-07`, 1_000_000, 400_000),
  receivable(`credit:${unitA.id}`, 500_000),
  receivable(`opening:${unitB.id}`, 300_000),
  receivable(`share:${unitB.id}:rec1`, 200_000)
]

describe('collectionByMonth', () => {
  it('bills and collects only the monthly charges, never credit, previous debts or shares', () => {
    const months = collectionByMonth(receivables, ['1405-06', '1405-07'])

    expect(months.map(({ billed, collected }) => ({ billed, collected }))).toEqual([
      { billed: 2_000_000, collected: 1_000_000 },
      { billed: 2_000_000, collected: 400_000 }
    ])
    expect(collectionRate(months)).toBe(35)
  })

  it('has no rate before anything is billed and pairs collected with billed for the chart', () => {
    expect(collectionRate(collectionByMonth([], ['1405-06']))).toBeNull()

    expect(collectionFlow(collectionByMonth(receivables, ['1405-06']))[0]).toMatchObject({
      income: 1_000_000,
      expense: 2_000_000,
      net: -1_000_000
    })
  })
})

const record = (
  amount: number,
  category: string,
  extra: Record<string, string> = {}
): RecordRow => ({
  id: `${category}${amount}`,
  createdAt: '',
  values: { amount: String(amount), date: '2026-09-10', category, ...extra }
})

const range = { start: '2026-09-01', end: '2026-09-30' }

describe('periodFlow', () => {
  const { EXPENSE_KINDS, EXPENSE_PAYERS } = DEFAULT_MANAGED_LISTS

  const income = {
    records: [
      record(3_000_000, 'شارژ ساختمان'),
      record(100_000, 'پارکینگ مهمان'),
      record(700_000, 'اصلاح موجودی'),
      record(9, 'شارژ ساختمان', { date: '2026-08-31' })
    ]
  }

  const expense = {
    records: [
      record(800_000, 'آسانسور', { expenseKind: 'current' }),
      record(2_000_000, 'تعمیرات', { expenseKind: 'capital' }),
      record(100_000, 'آسانسور', { expenseKind: 'current' }),
      record(5_000_000, 'انتقال', { expenseKind: 'current' }),
      record(40_000, 'اصلاح موجودی'),
      record(60_000, 'تطبیق')
    ]
  }

  const flow = periodFlow(income, expense, range, EXPENSE_KINDS, EXPENSE_PAYERS)

  it('leaves out transfers, corrections and other months', () => {
    expect(flow.income).toBe(3_100_000)
    expect(flow.expense).toBe(2_900_000)
  })

  it('splits the spending by category and by kind', () => {
    expect(flow.byCategory).toEqual([
      { name: 'تعمیرات', total: 2_000_000 },
      { name: 'آسانسور', total: 900_000 }
    ])
    expect(flow.byKind).toEqual([
      { value: 'current', label: 'جاری', amount: 900_000 },
      { value: 'capital', label: 'عمرانی', amount: 2_000_000 }
    ])
  })
})

const profile = {
  name: 'نرگس',
  address: '',
  floors: 2,
  defaultCharge: 1_000_000,
  chargeMethod: 'fixed' as const,
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'full' as const
}

describe('debtorTable', () => {
  const rows = buildUnitRows({ units: [unitA, unitB], stays, persons, receivables, profile })

  const table = debtorTable(rows, receivables)

  it('lists only the units that owe, the largest debt first, with their months', () => {
    expect(table.rows.map(row => [row.unitNumber, row.name, row.amount])).toEqual([
      ['2', 'کاظمی', 2_100_000],
      ['1', 'موسوی', 1_000_000]
    ])
    expect(table.rows[0].months).toEqual(['شهریور', 'مهر'])
  })

  it('keeps unit credit out of what is owed and reports it on its own', () => {
    expect(table.total).toBe(3_100_000)
    expect(table.credit).toBe(500_000)
    expect(table.rows.find(row => row.unitNumber === '1')?.credit).toBe(500_000)
  })
})

const entry = (accountId: string, date: string, balanceAfter: number): LedgerEntry => ({
  id: `${accountId}${date}`,
  createdAt: '',
  accountId,
  date,
  delta: 0,
  balanceAfter,
  title: '',
  source: 'ثبت',
  recordId: '',
  applied: true
})

describe('fundBalanceSeries', () => {
  it('sums every account at its last balance on or before the end of the month', () => {
    const series = fundBalanceSeries(
      [
        entry('a', '2026-08-20', 1_000_000),
        entry('b', '2026-09-05', 400_000),
        entry('a', '2026-09-12', 1_500_000),
        entry('a', '2026-10-02', 9_000_000),
        entry('gone', '2026-09-01', 7)
      ],
      ['a', 'b'],
      ['1405-05', '1405-06', '1405-07']
    )

    expect(series.map(point => point.balance)).toEqual([1_000_000, 1_900_000, 9_400_000])
  })

  it('is empty before the first entry', () => {
    expect(
      fundBalanceSeries([entry('a', '2026-09-12', 5)], ['a'], ['1405-05'])[0].balance
    ).toBeNull()
  })
})

describe('openDebts', () => {
  const dang = (counterparty: string, amount: number, paid = false): Dang => ({
    id: counterparty + amount,
    createdAt: '',
    title: '',
    category: '',
    counterparty,
    amount,
    date: '2026-09-01',
    note: '',
    paid,
    paidAt: '',
    payments: []
  })

  it('splits the unpaid debts into the manager and the rest, largest first', () => {
    const debts = openDebts(
      [
        dang('مدیر', 2_400_000),
        dang('مدیر', 100_000, true),
        dang('آسانسور پارس', 700_000),
        dang('نظافت', 900_000),
        dang('نظافت', 100_000)
      ],
      ['مدیر']
    )

    expect(debts.manager).toBe(2_400_000)
    expect(debts.contractors).toEqual([
      { name: 'نظافت', amount: 1_000_000 },
      { name: 'آسانسور پارس', amount: 700_000 }
    ])
    expect(debts.total).toBe(4_100_000)
  })
})

describe('periodWindow', () => {
  const today = '2026-10-20'

  it('covers a Jalali year, six months or one month', () => {
    expect(periodWindow({ mode: 'year', value: '1405' }, today)).toMatchObject({
      title: '۱۴۰۵',
      range: { start: '2026-03-21', end: '2027-03-20' }
    })
    expect(periodWindow({ mode: 'year', value: '1405' }, today).monthKeys).toHaveLength(7)
    expect(periodWindow({ mode: 'year', value: '1404' }, today).monthKeys).toHaveLength(12)
    expect(periodWindow({ mode: 'six', value: '' }, today).monthKeys).toHaveLength(6)
    expect(periodWindow({ mode: 'month', value: '1405-07' }, today).monthKeys).toEqual(['1405-07'])
  })

  it('offers the last years and the last twelve months', () => {
    expect(periodChoices('year', today).map(choice => choice.value)).toEqual([
      '1405',
      '1404',
      '1403'
    ])
    expect(periodChoices('month', today)).toHaveLength(12)
    expect(periodChoices('six', today)).toEqual([])
  })
})
