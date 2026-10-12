import { describe, expect, it } from 'vitest'

import { budgetUsage, pickBudgetAlerts, rowToBudget, threeMonthAverage } from './budgets'
import { getJalaliMonthRange } from '../utils/dateRange'
import { budgetLineText } from '../utils/insightText'

function expense(monthKey: string, category: string, amount: number) {
  return {
    values: { date: getJalaliMonthRange(monthKey)!.start, category, amount: String(amount) }
  }
}

describe('threeMonthAverage', () => {
  it('averages the three months before the given one', () => {
    const records = [
      expense('1405-04', 'خوراک', 600_000),
      expense('1405-05', 'خوراک', 700_000),
      expense('1405-06', 'خوراک', 920_000),
      expense('1405-07', 'خوراک', 5_000_000),
      expense('1405-03', 'خوراک', 9_000_000)
    ]

    expect(threeMonthAverage(records, 'date', 'خوراک', '1405-07')).toBe(740_000)
  })

  it('skips months without any expense and counts other categories as activity', () => {
    const records = [expense('1405-05', 'اجاره', 100), expense('1405-06', 'خوراک', 900_000)]

    // Two active months (مرداد, شهریور); خوراک only in one of them.
    expect(threeMonthAverage(records, 'date', 'خوراک', '1405-07')).toBe(450_000)
  })

  it('is 0 without history', () => {
    expect(threeMonthAverage([], 'date', 'خوراک', '1405-07')).toBe(0)
  })
})

describe('budgetUsage', () => {
  it('marks spending past the budget as over', () => {
    expect(budgetUsage(890_000, 800_000)).toMatchObject({
      over: true,
      overBy: 90_000,
      level: 'over'
    })
    expect(budgetUsage(800_000, 800_000)).toMatchObject({ over: false, level: 'warn' })
    expect(budgetUsage(300_000, 500_000)).toMatchObject({ over: false, ratio: 0.6, level: 'ok' })
  })

  it('writes the budget line', () => {
    expect(budgetLineText(890_000, 800_000)).toBe('۸۹۰٬۰۰۰ از بودجه ۸۰۰٬۰۰۰ · ۹۰ هزار بیشتر')
    expect(budgetLineText(480_000, 500_000)).toBe('۴۸۰٬۰۰۰ از ۵۰۰٬۰۰۰')
  })

  it('reads only positive budgets from the sheet', () => {
    expect(rowToBudget(['خوراک', '800000', 'x'])).toEqual({
      category: 'خوراک',
      amount: 800_000,
      updatedAt: 'x'
    })
    expect(rowToBudget(['خوراک', '0'])).toBeNull()
  })
})

describe('pickBudgetAlerts', () => {
  const budgets = [{ category: 'خوراک', amount: 1000, updatedAt: '' }]
  const spent = (amount: number) => new Map([['خوراک', amount]])

  it('alerts once per category per month', () => {
    const first = pickBudgetAlerts(budgets, spent(850), '1405-07', '2026-10-10', {})

    expect(first.lines).toEqual(['خوراک به ۸۰٪ بودجه رسید'])

    // Same day again (the app reopened): still in tonight's digest.
    expect(pickBudgetAlerts(budgets, spent(860), '1405-07', '2026-10-10', first.log).lines).toEqual(
      ['خوراک به ۸۰٪ بودجه رسید']
    )

    // The next day: nothing new.
    const next = pickBudgetAlerts(budgets, spent(900), '1405-07', '2026-10-11', first.log)

    expect(next.lines).toEqual([])

    // Going over is its own alert, once.
    const over = pickBudgetAlerts(budgets, spent(1200), '1405-07', '2026-10-12', next.log)

    expect(over.lines).toEqual(['خوراک از بودجه گذشت'])
    expect(pickBudgetAlerts(budgets, spent(1300), '1405-07', '2026-10-13', over.log).lines).toEqual(
      []
    )
  })

  it('skips the 80% line when the budget is passed in one go, and resets next month', () => {
    const jump = pickBudgetAlerts(budgets, spent(1500), '1405-07', '2026-10-10', {})

    expect(jump.lines).toEqual(['خوراک از بودجه گذشت'])

    const nextMonth = pickBudgetAlerts(budgets, spent(900), '1405-08', '2026-10-25', jump.log)

    expect(nextMonth.lines).toEqual(['خوراک به ۸۰٪ بودجه رسید'])
    expect(Object.keys(nextMonth.log).every(key => key.startsWith('1405-08|'))).toBe(true)
  })

  it('stays quiet below 80%', () => {
    expect(pickBudgetAlerts(budgets, spent(700), '1405-07', '2026-10-10', {}).lines).toEqual([])
  })
})
