import { describe, expect, it } from 'vitest'

import type { NetWorthSnapshot } from './netWorth'
import { netWorthAtMonthEnd } from './netWorthMonthEnd'

const snapshot = (monthKey: string, netWorth: number): NetWorthSnapshot => ({
  monthKey,
  netWorth,
  assets: netWorth,
  liabilities: 0,
  recordedAt: '',
  source: 'auto'
})

const base = { snapshots: [snapshot('1405-06', 10)], lastMonthKey: '1405-07' }

describe('netWorthAtMonthEnd', () => {
  it('uses the stored snapshot first', () => {
    expect(netWorthAtMonthEnd('1405-06', { ...base, rebuild: () => 5, todayNetWorth: 99 })).toEqual(
      {
        value: 10,
        basis: 'snapshot'
      }
    )
  })

  it('rebuilds a closed month without a snapshot', () => {
    expect(netWorthAtMonthEnd('1405-07', { ...base, rebuild: () => 5, todayNetWorth: 99 })).toEqual(
      {
        value: 5,
        basis: 'rebuilt'
      }
    )
    // A rebuilt zero is a value, not "unknown".
    expect(netWorthAtMonthEnd('1405-07', { ...base, rebuild: () => 0 })?.value).toBe(0)
  })

  it('offers today’s value, flagged, only for the month just ended', () => {
    const source = { ...base, rebuild: () => null, todayNetWorth: 99 }

    expect(netWorthAtMonthEnd('1405-07', source)).toEqual({ value: 99, basis: 'today' })
    expect(netWorthAtMonthEnd('1405-05', source)).toBeNull()
    expect(netWorthAtMonthEnd('1405-07', { ...base, todayNetWorth: null })).toBeNull()
  })

  it('has no end-of-month figure for a month that is not closed', () => {
    expect(
      netWorthAtMonthEnd('1405-08', { ...base, rebuild: () => 5, todayNetWorth: 99 })
    ).toBeNull()
    expect(netWorthAtMonthEnd('1405-05', { snapshots: [], rebuild: () => 5 })).toBeNull()
  })
})
