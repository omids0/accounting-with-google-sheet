import { describe, expect, it } from 'vitest'

import { compareCategories, compareMonths, summarizePreviousMonth } from './monthComparison'
import { getJalaliMonthRange } from '../utils/dateRange'
import { categoryComparisonText, heroExpenseComparisonText } from '../utils/insightText'

describe('compareMonths', () => {
  it('reads within ±2% as the same', () => {
    expect(compareMonths(102, 100)).toEqual({ trend: 'same', percent: 0 })
    expect(compareMonths(98, 100)).toEqual({ trend: 'same', percent: 0 })
  })

  it('reports up and down past the threshold', () => {
    expect(compareMonths(103, 100)).toEqual({ trend: 'up', percent: 3 })
    expect(compareMonths(130, 100)).toEqual({ trend: 'up', percent: 30 })
    expect(compareMonths(85, 100)).toEqual({ trend: 'down', percent: 15 })
  })

  it('has nothing to say without last month', () => {
    expect(compareMonths(100, 0)).toBeNull()
  })

  it('formats the row and hero texts', () => {
    expect(categoryComparisonText({ trend: 'up', percent: 30 }, 'شهریور')).toBe('↑ ۳۰؜٪ از شهریور')
    expect(categoryComparisonText({ trend: 'down', percent: 15 }, 'شهریور')).toBe('↓ ۱۵؜٪')
    expect(categoryComparisonText({ trend: 'same', percent: 0 }, 'شهریور')).toBe('= مثل شهریور')
    expect(heroExpenseComparisonText({ trend: 'down', percent: 12 }, 'شهریور')).toBe(
      'هزینه ماه ۱۲؜٪ کمتر از شهریور'
    )
  })
})

describe('compareCategories', () => {
  it('compares only categories recorded last month', () => {
    const result = compareCategories(
      [
        { name: 'خوراک', total: 130 },
        { name: 'تفریح', total: 50 }
      ],
      [{ name: 'خوراک', total: 100 }]
    )

    expect(result.get('خوراک')).toEqual({ trend: 'up', percent: 30 })
    expect(result.has('تفریح')).toBe(false)
  })
})

describe('summarizePreviousMonth', () => {
  it('sums the month before, named from the Jalali calendar', () => {
    const day = (monthKey: string) => getJalaliMonthRange(monthKey)!.start
    const summary = summarizePreviousMonth(
      {
        incomeRecords: [{ values: { date: day('1405-06'), amount: '500', category: 'حقوق' } }],
        expenseRecords: [
          { values: { date: day('1405-06'), amount: '100', category: 'خوراک' } },
          { values: { date: day('1405-07'), amount: '999', category: 'خوراک' } }
        ],
        incomeDateField: 'date',
        expenseDateField: 'date'
      },
      '1405-07'
    )

    expect(summary).toMatchObject({ monthName: 'شهریور', totalIncome: 500, totalExpense: 100 })
    expect(summary?.expenseByCategory).toEqual([{ name: 'خوراک', total: 100 }])
  })
})
