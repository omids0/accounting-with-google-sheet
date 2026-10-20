import { describe, expect, it } from 'vitest'

import { ASSEMBLY_HEADERS, assemblyRows, buildBuildingReport } from './buildingAssembly'
import { DEFAULT_MANAGED_LISTS } from './buildingLists'
import { periodWindow } from './buildingReports'
import { newStay } from './buildingResidents'
import { newUnit } from './buildingUnits'
import { buildUnitRows } from '../components/buildings/unitRows'
import type { Counterparty, Dang, Receivable, RecordRow } from '../types'
import { formatMoney } from '../utils/formatMoney'

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

const unit = { ...newUnit({ number: '3', floor: 1, area: 90 }), rowNumber: 2 }

const stays = [{ ...newStay({ unitId: unit.id, personId: 'p1', role: 'owner' }), rowNumber: 2 }]

const charge = (reference: string, amount: number, paid = 0): Receivable => ({
  id: reference,
  createdAt: '',
  title: reference,
  debtor: '',
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-09-01',
  note: '',
  payments: paid ? [{ id: 'p', amount: paid, paidAt: '2026-09-04', note: '' }] : [],
  reference
})

const receivables = [
  charge(`charge:${unit.id}:1405-06`, 1_000_000, 600_000),
  charge(`credit:${unit.id}`, 250_000)
]

const record = (
  amount: number,
  category: string,
  extra: Record<string, string> = {}
): RecordRow => ({
  id: `${category}${amount}`,
  createdAt: '',
  values: { amount: String(amount), date: '2026-09-10', category, ...extra }
})

const dang = (counterparty: string, amount: number): Dang => ({
  id: counterparty,
  createdAt: '',
  title: '',
  category: '',
  counterparty,
  amount,
  date: '2026-09-01',
  note: '',
  paid: false,
  paidAt: ''
})

const profile = {
  name: 'نرگس',
  address: '',
  floors: 1,
  defaultCharge: 1_000_000,
  chargeMethod: 'fixed' as const,
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'full' as const
}

const report = buildBuildingReport({
  window: periodWindow({ mode: 'month', value: '1405-06' }, '2026-10-20'),
  income: { records: [record(600_000, 'شارژ ساختمان'), record(50_000, 'اصلاح موجودی')] },
  expense: {
    records: [
      record(300_000, 'آسانسور', { expenseKind: 'current' }),
      record(900_000, 'انتقال', { expenseKind: 'current' })
    ]
  },
  kinds: DEFAULT_MANAGED_LISTS.EXPENSE_KINDS,
  payers: DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS,
  receivables,
  unitRows: buildUnitRows({
    units: [unit],
    stays,
    persons: [person('p1', 'موسوی')],
    receivables,
    profile
  }),
  accounts: [
    { id: 'a1', title: 'بانک ملی', balance: 2_000_000 },
    { id: 'a2', title: 'نقد', balance: 150_000 }
  ],
  ledger: [],
  dangs: [dang('مدیر', 400_000), dang('پیمانکار', 100_000)],
  managerNames: ['مدیر']
})

describe('buildBuildingReport', () => {
  it('names the meeting report after the period', () => {
    expect(report.title).toBe('گزارش مجمع شهریور ۱۴۰۵')
    expect(report.fund.total).toBe(2_150_000)
    expect(report.rate).toBe(60)
  })

  it('leaves transfers and corrections out of income and spending', () => {
    expect(report.flow.income).toBe(600_000)
    expect(report.flow.expense).toBe(300_000)
  })
})

describe('assemblyRows', () => {
  const rows = assemblyRows(report)

  const section = (name: string) => rows.filter(row => row[0] === name)

  it('has one cell per header on every row', () => {
    expect(rows.every(row => row.length === ASSEMBLY_HEADERS.length)).toBe(true)
  })

  it('opens with the totals', () => {
    expect(section('خلاصه').map(row => row[2])).toEqual([
      formatMoney(600_000),
      formatMoney(300_000),
      formatMoney(300_000)
    ])
  })

  it('lists billed and collected, the debtor without the credit in its amount, and the debts', () => {
    expect(section('صدور و وصول')[0].slice(1, 3)).toEqual(['شهریور ۱۴۰۵', formatMoney(1_000_000)])
    expect(section('بدهکاران')[0].slice(1, 3)).toEqual(['واحد ۳ · موسوی', formatMoney(400_000)])
    expect(section('بدهکاران')[0][3]).toContain(formatMoney(250_000))
    expect(section('اعتبار واحدها')[0][2]).toBe(formatMoney(250_000))
    expect(section('بدهی ساختمان').map(row => row[1])).toEqual(['به مدیر', 'پیمانکار'])
  })

  it('closes with the fund accounts and their total', () => {
    expect(section('صندوق').map(row => row[1])).toEqual(['بانک ملی', 'نقد', 'جمع موجودی'])
    expect(section('صندوق').at(-1)?.[2]).toBe(formatMoney(2_150_000))
  })
})
