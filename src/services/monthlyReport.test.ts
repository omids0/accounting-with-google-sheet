import { beforeEach, describe, expect, it } from 'vitest'

import { buildMonthlyReport, monthlyReportTitle, type MonthlyReportInput } from './monthlyReport'
import {
  getMonthlyReportState,
  markMonthlyReportHandled,
  monthlyReportDue,
  MONTHLY_REPORT_STORAGE_KEY,
  setMonthlyReportOn
} from './monthlyReportGate'
import type { NetWorthSnapshot } from './netWorth'
import type { Check, InstallmentPlan } from '../types'
import { jalaliToIso } from '../utils/jalaliDate'

const mehr = (d: number) => jalaliToIso(1405, 7, d)
const aban = (d: number) => jalaliToIso(1405, 8, d)

const rec = (date: string, amount: number, category = 'حقوق', note = '') => ({
  values: { date, amount: String(amount), category, note }
})

const plan = (dates: [string, boolean][]): InstallmentPlan => ({
  id: 'p',
  createdAt: '',
  title: 'وام',
  amount: 1_000_000,
  count: dates.length,
  dueDay: 5,
  startDate: dates[0][0],
  note: '',
  payments: dates.map(([dueDate, paid], i) => ({ n: i + 1, paid, paidAt: '', dueDate }))
})

const check = (dueDate: string, paid: boolean, paidAt = ''): Check => ({
  id: dueDate + paid,
  createdAt: '',
  checkNumber: '1',
  direction: 'paid',
  counterparty: '',
  amount: 1,
  creationDate: '',
  dueDate,
  paid,
  paidAt
})

const snapshot = (monthKey: string, netWorth: number): NetWorthSnapshot => ({
  monthKey,
  netWorth,
  assets: netWorth,
  liabilities: 0,
  recordedAt: '',
  source: 'auto'
})

const input: MonthlyReportInput = {
  records: {
    incomeRecords: [
      rec(mehr(1), 25_000_000),
      rec(mehr(20), 3_000_000, 'اجاره دریافتی', 'تکراری'),
      rec(aban(2), 9_000_000)
    ],
    expenseRecords: [
      rec(mehr(3), 500_000, 'خوراک'),
      rec(mehr(18), 390_000, 'خوراک'),
      rec(mehr(5), 480_000, 'اجاره', 'تکرار ماهانه · مهر'),
      rec(mehr(9), 300_000, 'خودرو'),
      rec(mehr(10), 17_730_000, 'سفر'),
      rec(aban(1), 999_000, 'خوراک')
    ],
    incomeDateField: 'date',
    expenseDateField: 'date'
  },
  budgets: [
    { category: 'اجاره', amount: 500_000, updatedAt: '' },
    { category: 'خوراک', amount: 800_000, updatedAt: '' },
    { category: 'خودرو', amount: 500_000, updatedAt: '' },
    { category: 'پوشاک', amount: 400_000, updatedAt: '' }
  ],
  installmentPlans: [
    plan([
      [mehr(5), true],
      [aban(5), false]
    ]),
    plan([
      [mehr(10), true],
      [mehr(25), false]
    ])
  ],
  checks: [check(mehr(12), true), check(mehr(28), true, aban(1)), check(mehr(30), false)],
  snapshots: [snapshot('1405-06', 30_570_000), snapshot('1405-07', 29_770_000)]
}

describe('monthly report data', () => {
  const report = buildMonthlyReport('1405-07', input)

  it('sums the month only: income, expense, net', () => {
    expect(report.income).toBe(28_000_000)
    expect(report.expense).toBe(19_400_000)
    expect(report.net).toBe(8_600_000)
  })

  it('lists every budgeted category, fullest first, over budget flagged', () => {
    expect(report.budgets.map(b => [b.category, b.spent, b.over])).toEqual([
      ['خوراک', 890_000, true],
      ['اجاره', 480_000, false],
      ['خودرو', 300_000, false],
      ['پوشاک', 0, false]
    ])
    expect(report.budgets[1].ratio).toBeCloseTo(0.96)
  })

  it('counts installments due in the month, checks cleared and recurring posts', () => {
    expect(report.installments).toEqual({ paid: 2, due: 3 })
    // Cleared by payment date: the 28 Mehr check was paid on 1 Aban.
    expect(report.checksCleared).toBe(1)
    expect(report.recurringPosted).toBe(2)
  })

  it('takes net worth and its change from the snapshots', () => {
    expect(report.netWorth).toBe(29_770_000)
    expect(report.netWorthChange).toBe(-800_000)
  })

  it('uses today’s value for the month just ended before its snapshot exists', () => {
    const fresh = buildMonthlyReport('1405-07', {
      ...input,
      snapshots: [snapshot('1405-06', 30_000_000)],
      todayNetWorth: 31_000_000,
      lastMonthKey: '1405-07'
    })

    expect(fresh.netWorth).toBe(31_000_000)
    expect(fresh.netWorthChange).toBe(1_000_000)
    expect(buildMonthlyReport('1405-05', input).netWorth).toBeNull()
  })

  it('titles the page with the month and year', () => {
    expect(monthlyReportTitle('1405-07')).toBe('حساب کتاب · مهر ۱۴۰۵')
  })
})

const at = (iso: string, time: string) => new Date(`${iso}T${time}`)

describe('first-of-month report gate', () => {
  beforeEach(() => localStorage.removeItem(MONTHLY_REPORT_STORAGE_KEY))

  it('opens on the first Jalali day from 09:00, announcing the month that ended', () => {
    expect(monthlyReportDue({}, at(aban(1), '08:59:00'))).toBeNull()
    expect(monthlyReportDue({}, at(aban(1), '09:00:00'))).toBe('1405-07')
    expect(monthlyReportDue({}, at(aban(2), '10:00:00'))).toBeNull()
    expect(monthlyReportDue({}, at(jalaliToIso(1406, 1, 1), '12:00:00'))).toBe('1405-12')
  })

  it('shows once per month: viewing or ✕ hides it until next month', () => {
    markMonthlyReportHandled('s1', at(aban(1), '09:30:00'))

    const state = getMonthlyReportState('s1')

    expect(monthlyReportDue(state, at(aban(1), '20:00:00'))).toBeNull()
    expect(monthlyReportDue(state, at(jalaliToIso(1405, 9, 1), '09:10:00'))).toBe('1405-08')
    expect(monthlyReportDue(getMonthlyReportState('s2'), at(aban(1), '20:00:00'))).toBe('1405-07')
  })

  it('stays off when the setting is off, per spreadsheet', () => {
    setMonthlyReportOn('s1', false)
    expect(monthlyReportDue(getMonthlyReportState('s1'), at(aban(1), '10:00:00'))).toBeNull()
    setMonthlyReportOn('s1', true)
    expect(monthlyReportDue(getMonthlyReportState('s1'), at(aban(1), '10:00:00'))).toBe('1405-07')
  })
})
