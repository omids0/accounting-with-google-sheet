import { describe, expect, it } from 'vitest'

import {
  aggregateMonthlyNet,
  closingBalanceOf,
  deriveOpeningBalances,
  findEarliestRecordDate,
  isBeforeAnchor,
  resolveAccountingStartDate,
  shouldReseedStartAmount,
  type MonthlyNetTotals
} from './openingBalanceDerive'
import { getJalaliMonthKey } from '../utils/dateRange'

function net(entries: Record<string, [number, number]>): Map<string, MonthlyNetTotals> {
  return new Map(
    Object.entries(entries).map(([monthKey, [income, expense]]) => [monthKey, { income, expense }])
  )
}

describe('deriveOpeningBalances', () => {
  it('chains each month opening from the previous month closing', () => {
    const openings = deriveOpeningBalances(
      { monthKey: '1405-06', amount: 1_000 },
      net({ '1405-06': [500, 200], '1405-07': [0, 300] }),
      '1405-08'
    )

    expect(openings.get('1405-06')).toBe(1_000)
    expect(openings.get('1405-07')).toBe(1_300)
    expect(openings.get('1405-08')).toBe(1_000)
  })

  it('reflects a retroactive entry in every later month', () => {
    const before = deriveOpeningBalances(
      { monthKey: '1405-06', amount: 1_000 },
      net({ '1405-06': [0, 0] }),
      '1405-08'
    )

    const after = deriveOpeningBalances(
      { monthKey: '1405-06', amount: 1_000 },
      net({ '1405-06': [0, 400] }),
      '1405-08'
    )

    expect(before.get('1405-07')).toBe(1_000)
    expect(after.get('1405-07')).toBe(600)
    expect(after.get('1405-08')).toBe(600)
  })

  it('crosses the Jalali year boundary', () => {
    const openings = deriveOpeningBalances(
      { monthKey: '1405-12', amount: 800 },
      net({ '1405-12': [200, 0] }),
      '1406-01'
    )

    expect(openings.get('1406-01')).toBe(1_000)
  })

  it('never emits months before the anchor', () => {
    const openings = deriveOpeningBalances(
      { monthKey: '1405-06', amount: 1_000 },
      net({ '1405-05': [9_999, 0] }),
      '1405-07'
    )

    expect(openings.has('1405-05')).toBe(false)
    expect(openings.get('1405-06')).toBe(1_000)
  })

  it('keeps the anchor when the through month precedes it', () => {
    const openings = deriveOpeningBalances(
      { monthKey: '1405-06', amount: 1_000 },
      net({}),
      '1405-01'
    )

    expect(openings.get('1405-06')).toBe(1_000)
    expect(openings.size).toBe(1)
  })

  it('returns nothing for a malformed anchor', () => {
    expect(deriveOpeningBalances({ monthKey: 'x', amount: 5 }, net({}), '1405-07').size).toBe(0)
  })
})

describe('closingBalanceOf', () => {
  it('adds the month flow to its opening', () => {
    const monthlyNet = net({ '1405-06': [500, 120] })

    const openings = deriveOpeningBalances(
      { monthKey: '1405-06', amount: 1_000 },
      monthlyNet,
      '1405-06'
    )

    expect(closingBalanceOf(openings, monthlyNet, '1405-06')).toBe(1_380)
  })
})

describe('aggregateMonthlyNet', () => {
  it('buckets records by their Jalali month', () => {
    const iso = '2026-09-07'

    const monthKey = getJalaliMonthKey(iso)

    const totals = aggregateMonthlyNet(
      [{ values: { date: iso, amount: '1000' } }],
      [{ values: { paidAt: iso, amount: '250' } }],
      'date',
      'paidAt'
    )

    expect(totals.get(monthKey)).toEqual({ income: 1_000, expense: 250 })
  })

  it('ignores records without a usable date', () => {
    const totals = aggregateMonthlyNet(
      [{ values: { date: '', amount: '900' } }],
      [],
      'date',
      'date'
    )

    expect(totals.size).toBe(0)
  })
})

describe('isBeforeAnchor', () => {
  it('separates historical months from automated ones', () => {
    expect(isBeforeAnchor('1405-05', '1405-06')).toBe(true)
    expect(isBeforeAnchor('1405-06', '1405-06')).toBe(false)
    expect(isBeforeAnchor('1405-07', '1405-06')).toBe(false)
  })
})

describe('resolveAccountingStartDate', () => {
  it('prefers the earliest of membership date and oldest record', () => {
    expect(resolveAccountingStartDate('2026-08-23', '2026-07-01', '2026-09-01')).toBe('2026-07-01')
  })

  it('falls back to the oldest record for users without a membership date', () => {
    expect(resolveAccountingStartDate('', '2026-07-01', '2026-09-01')).toBe('2026-07-01')
  })

  it('falls back to the anchor month when nothing else is known', () => {
    expect(resolveAccountingStartDate('', '', '2026-09-01')).toBe('2026-09-01')
  })
})

describe('findEarliestRecordDate', () => {
  it('scans both income and expense records', () => {
    const earliest = findEarliestRecordDate(
      [{ values: { date: '2026-09-01', amount: '1' } }],
      [{ values: { date: '2026-07-15', amount: '1' } }],
      'date',
      'date'
    )

    expect(earliest).toBe('2026-07-15')
  })

  it('returns an empty string when there are no dated records', () => {
    expect(findEarliestRecordDate([], [], 'date', 'date')).toBe('')
  })
})

describe('shouldReseedStartAmount', () => {
  const base = {
    anchorMonthKey: '1405-06',
    currentMonthKey: '1405-06',
    storedAmount: 0,
    walletTotal: 5_000_000,
    hasRecords: false
  }

  it('adopts the wallet total when the start month was seeded before any wallet existed', () => {
    expect(shouldReseedStartAmount(base)).toBe(true)
  })

  it('freezes once the first transaction is recorded', () => {
    expect(shouldReseedStartAmount({ ...base, hasRecords: true })).toBe(false)
  })

  it('freezes once the start month is in the past', () => {
    expect(shouldReseedStartAmount({ ...base, currentMonthKey: '1405-07' })).toBe(false)
  })

  it('never overwrites an amount the user already has', () => {
    expect(shouldReseedStartAmount({ ...base, storedAmount: 3_000_000 })).toBe(false)
  })

  it('does nothing while the wallet is still empty', () => {
    expect(shouldReseedStartAmount({ ...base, walletTotal: 0 })).toBe(false)
  })
})
