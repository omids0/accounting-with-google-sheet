import { describe, expect, it } from 'vitest'

import { aggregateByCounterparty } from './counterpartiesReport'
import { fakeRecord } from './recordInputs.fake'

const RANGE = { start: '2026-10-01', end: '2026-10-31' }

const records = [
  fakeRecord({ date: '2026-10-02', amount: 600000, counterparty: 'رضا', category: 'خوراک' }),
  fakeRecord({ date: '2026-10-05', amount: 200000, counterparty: 'رضا', category: 'خوراک' }),
  fakeRecord({ date: '2026-10-06', amount: 100000, counterparty: 'رضا', category: 'حمل‌ونقل' }),
  fakeRecord({ date: '2026-10-07', amount: 300000, counterparty: 'علی', category: 'اجاره' }),
  fakeRecord({ date: '2026-10-08', amount: 150000 }),
  fakeRecord({ date: '2026-09-01', amount: 999, counterparty: 'قدیمی' }),
  fakeRecord({ type: 'income', date: '2026-10-09', amount: 500000, counterparty: 'شرکت' })
]

describe('aggregateByCounterparty', () => {
  it('totals each counterparty of the expenses in range, largest first', () => {
    const { rows, withTotal } = aggregateByCounterparty(records, RANGE, 'expense')

    expect(withTotal).toBe(1200000)
    expect(rows.map(row => [row.name, row.count, row.total, row.topCategory])).toEqual([
      ['رضا', 3, 900000, 'خوراک'],
      ['علی', 1, 300000, 'اجاره']
    ])
    expect(rows[0].share).toBeCloseTo(0.75)
    expect(rows[1].share).toBeCloseTo(0.25)
  })

  it('counts records without a counterparty only in withoutTotal', () => {
    const result = aggregateByCounterparty(records, RANGE, 'expense')

    expect(result.withoutTotal).toBe(150000)
    expect(result.rows.some(row => row.name === '')).toBe(false)
  })

  it('honours the type filter and the range', () => {
    expect(aggregateByCounterparty(records, RANGE, 'income').rows.map(row => row.name)).toEqual([
      'شرکت'
    ])
    expect(aggregateByCounterparty(records, RANGE, 'all').rows).toHaveLength(3)
    expect(
      aggregateByCounterparty(records, { start: '2026-09-01', end: '2026-09-30' }, 'all').rows
    ).toHaveLength(1)
  })

  it('is empty without records', () => {
    expect(aggregateByCounterparty([], RANGE, 'all')).toEqual({
      rows: [],
      withTotal: 0,
      withoutTotal: 0
    })
  })
})
