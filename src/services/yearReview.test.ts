import { beforeEach, describe, expect, it } from 'vitest'

import type { NetWorthSnapshot } from './netWorth'
import type { LedgerEntry } from './walletLedger'
import { buildYearReview, savingsRate, yearNetWorthSpan, type YearReviewInput } from './yearReview'
import {
  dismissYearReview,
  reviewableYears,
  YEAR_REVIEW_STORAGE_KEY,
  yearReviewDue,
  yearReviewWindowYear
} from './yearReviewGate'
import { headlineAmount, yearReviewImage } from './yearReviewText'
import type { Check, InstallmentPlan, SavingsGoal } from '../types'
import { jalaliToIso } from '../utils/jalaliDate'

const j = jalaliToIso

describe('year review window (Jalali)', () => {
  it('runs from 25 Esfand to 15 Farvardin, reviewing the ending year', () => {
    expect(yearReviewWindowYear(j(1404, 12, 24))).toBeNull()
    expect(yearReviewWindowYear(j(1404, 12, 25))).toBe(1404)
    expect(yearReviewWindowYear(j(1404, 12, 29))).toBe(1404)
    expect(yearReviewWindowYear(j(1405, 1, 1))).toBe(1404)
    expect(yearReviewWindowYear(j(1405, 1, 15))).toBe(1404)
    expect(yearReviewWindowYear(j(1405, 1, 16))).toBeNull()
    expect(yearReviewWindowYear(j(1405, 7, 1))).toBeNull()
  })

  it('includes 30 Esfand of a leap year', () => {
    expect(yearReviewWindowYear(j(1403, 12, 30))).toBe(1403)
  })

  describe('dismissal', () => {
    beforeEach(() => localStorage.removeItem(YEAR_REVIEW_STORAGE_KEY))

    it('✕ closes this year only, per spreadsheet', () => {
      expect(yearReviewDue('s1', j(1405, 1, 2))).toBe(1404)
      dismissYearReview('s1', 1404)
      expect(yearReviewDue('s1', j(1405, 1, 3))).toBeNull()
      expect(yearReviewDue('s2', j(1405, 1, 3))).toBe(1404)
      expect(yearReviewDue('s1', j(1405, 12, 26))).toBe(1405)
    })
  })

  it('lists finished years, plus the ending one once its window opens', () => {
    expect(reviewableYears(1402, j(1405, 7, 1))).toEqual([1404, 1403, 1402])
    expect(reviewableYears(1404, j(1405, 12, 26))).toEqual([1405, 1404])
    expect(reviewableYears(null, j(1405, 7, 1))).toEqual([])
  })
})

describe('savings rate', () => {
  it('is a whole percent of income, rounded half away from zero', () => {
    expect(savingsRate(310_000_000, 248_000_000)).toBe(20)
    expect(savingsRate(1000, 875)).toBe(13)
    expect(savingsRate(1000, 1125)).toBe(-13)
    expect(savingsRate(3, 2)).toBe(33)
    expect(savingsRate(1000, 1000)).toBe(0)
    expect(savingsRate(0, 500)).toBeNull()
  })
})

const rec = (date: string, amount: number, category = 'حقوق') => ({
  values: { date, amount: String(amount), category }
})

const snapshot = (monthKey: string, netWorth: number): NetWorthSnapshot => ({
  monthKey,
  netWorth,
  assets: netWorth,
  liabilities: 0,
  recordedAt: '',
  source: 'auto'
})

const goal = (id: string, title: string, target: number): SavingsGoal => ({
  id,
  createdAt: '',
  title,
  target,
  targetDate: '',
  defaultAccountId: '',
  note: '',
  status: 'active'
})

const deposit = (goalId: string, date: string, amount: number): LedgerEntry => ({
  id: `${goalId}${date}`,
  createdAt: '',
  accountId: 'a',
  delta: -amount,
  balanceAfter: 0,
  applied: true,
  title: '',
  date,
  source: 'goal-deposit',
  recordId: goalId
})

const plans: InstallmentPlan[] = [
  {
    id: 'p',
    createdAt: '',
    title: 'وام',
    amount: 1,
    count: 3,
    dueDay: 1,
    startDate: '',
    note: '',
    payments: [
      { n: 1, paid: true, paidAt: j(1404, 12, 29), dueDate: j(1404, 12, 25) },
      { n: 2, paid: true, paidAt: j(1405, 1, 2), dueDate: j(1405, 1, 1) },
      { n: 3, paid: true, paidAt: '', dueDate: j(1405, 6, 1) }
    ]
  }
]

const checks: Check[] = [
  {
    id: 'c1',
    createdAt: '',
    checkNumber: '',
    counterparty: '',
    amount: 1,
    creationDate: '',
    dueDate: j(1405, 3, 1),
    paid: true,
    paidAt: ''
  },
  {
    id: 'c2',
    createdAt: '',
    checkNumber: '',
    counterparty: '',
    amount: 1,
    creationDate: '',
    dueDate: j(1405, 4, 1),
    paid: false,
    paidAt: ''
  }
]

const input: YearReviewInput = {
  records: {
    incomeRecords: [
      rec(j(1405, 1, 10), 200_000_000),
      rec(j(1405, 9, 10), 110_000_000),
      rec(j(1404, 12, 1), 7)
    ],
    expenseRecords: [
      rec(j(1405, 2, 1), 90_000_000, 'خوراک'),
      rec(j(1405, 12, 1), 60_000_000, 'خوراک'),
      rec(j(1405, 12, 5), 58_000_000, 'سفر'),
      rec(j(1405, 5, 1), 40_000_000, 'اجاره'),
      rec(j(1406, 1, 1), 99_000_000, 'سفر')
    ],
    incomeDateField: 'date',
    expenseDateField: 'date'
  },
  installmentPlans: plans,
  checks,
  snapshots: [snapshot('1404-12', 18_000_000), snapshot('1405-06', 22_000_000)],
  goals: [
    goal('g1', 'سفر عید', 10_000_000),
    goal('g2', 'خانه', 1_000_000_000),
    goal('g3', 'قدیمی', 1_000)
  ],
  ledger: [
    deposit('g1', j(1405, 3, 1), 6_000_000),
    deposit('g1', j(1405, 11, 1), 4_000_000),
    deposit('g2', j(1405, 3, 1), 5_000_000),
    deposit('g3', j(1404, 3, 1), 5_000)
  ],
  todayNetWorth: 29_800_000
}

describe('year review aggregations', () => {
  const review = buildYearReview(1405, input)

  it('sums the year: income, expense, savings and rate', () => {
    expect(review.income).toBe(310_000_000)
    expect(review.expense).toBe(248_000_000)
    expect(review.savings).toBe(62_000_000)
    expect(review.savingsRate).toBe(20)
  })

  it('finds the biggest expense category and the most expensive month', () => {
    expect(review.topExpenseCategory).toBe('خوراک')
    expect(review.topExpenseMonth).toBe(12)
  })

  it('counts installments paid and checks cleared inside the year', () => {
    expect(review.installmentsPaid).toBe(2)
    expect(review.checksCleared).toBe(1)
  })

  it('names goals first reached during the year only', () => {
    expect(review.goalsReached).toEqual(['سفر عید'])
  })

  it('spans net worth from last Esfand to today before this Esfand’s snapshot', () => {
    expect([review.netWorthFrom, review.netWorthTo]).toEqual([18_000_000, 29_800_000])
    expect(
      yearNetWorthSpan(1405, [...input.snapshots, snapshot('1405-12', 30_000_000)], 1)
    ).toEqual({
      from: 18_000_000,
      to: 30_000_000
    })
    // A past year never takes today's value once later snapshots exist.
    expect(yearNetWorthSpan(1405, [...input.snapshots, snapshot('1406-02', 5)], 1).to).toBe(
      22_000_000
    )
  })

  it('draws only the headline numbers on the shared card', () => {
    const image = yearReviewImage(review)

    expect(image.title).toBe('۱۴۰۵ در یک نگاه')
    expect(image.stats.map(stat => stat.value)).toEqual([
      '۳۱۰ میلیون',
      '۲۴۸ میلیون',
      headlineAmount(62_000_000, { showPlus: true }),
      'خوراک',
      'اسفند',
      '۲۰٪'
    ])
    expect(image.footer).toContain('دارایی خالص از ۱۸ میلیون به ۲۹٫۸ میلیون رسید')
    expect(image.footer).toContain('هدف «سفر عید» ✓')
  })
})
