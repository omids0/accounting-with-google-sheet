import { describe, expect, it } from 'vitest'

import { buildChartsData, chartsRangeFor, type ChartsRecords } from './chartsData'
import { cumulativeNetSeries } from './dashboardAggregation'
import { listRecentJalaliMonthKeys } from '../utils/dateRange'
import { jalaliToIso } from '../utils/jalaliDate'

const record = (jy: number, jm: number, jd: number, amount: number, category = 'سایر') => ({
  values: { date: jalaliToIso(jy, jm, jd), amount: String(amount), category }
})

const records: ChartsRecords = {
  incomeDateField: 'date',
  expenseDateField: 'date',
  incomeRecords: [
    record(1405, 7, 1, 18_000, 'حقوق'),
    record(1405, 6, 1, 10_000, 'حقوق'),
    record(1405, 2, 5, 4_000, 'فروش'),
    // Outside the six-month window ending in Mehr.
    record(1405, 1, 10, 99_000, 'حقوق')
  ],
  expenseRecords: [
    record(1405, 7, 3, 890, 'خوراک'),
    record(1405, 7, 5, 480, 'اجاره'),
    record(1405, 6, 9, 12_000, 'خوراک'),
    // After «today» (20 Mehr): not counted yet.
    record(1405, 7, 25, 5_000, 'خوراک')
  ]
}

const today = jalaliToIso(1405, 7, 20)

describe('listRecentJalaliMonthKeys', () => {
  it('lists the months ending at a key, oldest first, across the year boundary', () => {
    expect(listRecentJalaliMonthKeys('1405-02', 4)).toEqual([
      '1404-11',
      '1404-12',
      '1405-01',
      '1405-02'
    ])
  })
})

describe('buildChartsData (month)', () => {
  const data = buildChartsData(records, { mode: 'month', key: '1405-07' }, today)

  it('stops the current month at today', () => {
    expect(chartsRangeFor({ mode: 'month', key: '1405-07' }, today).end).toBe(today)
    expect(data.totalExpense).toBe(890 + 480)
    expect(data.totalIncome).toBe(18_000)
  })

  it('ranks the month’s categories with their shares', () => {
    expect(data.expenseByCategory.map(item => [item.name, item.total])).toEqual([
      ['خوراک', 890],
      ['اجاره', 480]
    ])
    expect(data.expenseByCategory[0].share).toBeCloseTo(890 / 1370)
  })

  it('builds a six-month window ending at the chosen month', () => {
    expect(data.flow.map(item => item.monthKey)).toEqual([
      '1405-02',
      '1405-03',
      '1405-04',
      '1405-05',
      '1405-06',
      '1405-07'
    ])
    expect(data.flow[0].income).toBe(4_000)
    expect(data.flow[4]).toMatchObject({ income: 10_000, expense: 12_000, net: -2_000 })
    expect(data.flow[5]).toMatchObject({ income: 18_000, expense: 1_370, net: 16_630 })
  })

  it('accumulates the monthly net from zero', () => {
    expect(data.cumulative.map(point => point.value)).toEqual([
      4_000, 4_000, 4_000, 4_000, 2_000, 18_630
    ])
  })
})

describe('cumulativeNetSeries', () => {
  it('is empty for an empty flow', () => {
    expect(cumulativeNetSeries([])).toEqual([])
  })
})
