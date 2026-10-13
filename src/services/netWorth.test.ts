import { describe, expect, it } from 'vitest'

import {
  largestChanges,
  monthsToRebuild,
  netWorthChanges,
  netWorthSnapshotToRow,
  rowToNetWorthSnapshot,
  snapshotMonthToWrite,
  yearStartValue,
  type NetWorthSnapshot
} from './netWorth'
import { buildNetWorthTrend } from './netWorthTrend'

function snap(monthKey: string, netWorth: number, source: NetWorthSnapshot['source'] = 'auto') {
  return { monthKey, netWorth, assets: netWorth, liabilities: 0, recordedAt: '', source }
}

describe('snapshotMonthToWrite', () => {
  it('writes the previous month on the first open of a month', () => {
    expect(snapshotMonthToWrite({}, '1405-07', new Set())).toBe('1405-06')
  })

  it('crosses the year boundary', () => {
    expect(snapshotMonthToWrite({ checkedMonth: '1404-12' }, '1405-01', new Set())).toBe('1404-12')
  })

  it('runs once per month', () => {
    expect(snapshotMonthToWrite({ checkedMonth: '1405-07' }, '1405-07', new Set())).toBeNull()
  })

  it('never overwrites an existing row (rebuilt, manual or auto)', () => {
    expect(snapshotMonthToWrite({ checkedMonth: '1405-06' }, '1405-07', new Set(['1405-06']))).toBe(
      null
    )
  })
})

describe('monthsToRebuild', () => {
  it('fills from the first record month up to the month before the first snapshot', () => {
    expect(monthsToRebuild('1405-03', new Set(['1405-06']), '1405-07')).toEqual([
      '1405-03',
      '1405-04',
      '1405-05'
    ])
  })

  it('stops before the current month without snapshots and caps the reach', () => {
    expect(monthsToRebuild('1400-01', new Set(), '1405-07', 3)).toEqual([
      '1405-04',
      '1405-05',
      '1405-06'
    ])
  })

  it('is empty without records', () => {
    expect(monthsToRebuild(null, new Set(), '1405-07')).toEqual([])
  })
})

describe('largestChanges', () => {
  const points = [
    snap('1405-01', 100),
    snap('1405-02', 400),
    snap('1405-03', 350),
    snap('1405-04', 900),
    snap('1405-05', 700),
    snap('1405-06', 720),
    // A gap: 1405-07 is missing, so 1405-08 has no change.
    snap('1405-08', 5000)
  ]

  it('compares consecutive months only', () => {
    expect(netWorthChanges(points).map(item => item.monthKey)).toEqual([
      '1405-02',
      '1405-03',
      '1405-04',
      '1405-05',
      '1405-06'
    ])
  })

  it('picks the three largest rises and falls, largest first', () => {
    const { rises, falls } = largestChanges(netWorthChanges(points))

    expect(rises).toEqual([
      { monthKey: '1405-04', change: 550 },
      { monthKey: '1405-02', change: 300 },
      { monthKey: '1405-06', change: 20 }
    ])
    expect(falls).toEqual([
      { monthKey: '1405-05', change: -200 },
      { monthKey: '1405-03', change: -50 }
    ])
  })
})

describe('yearStartValue and the trend', () => {
  const snapshots = [snap('1404-12', 1000), snap('1405-05', 1500), snap('1405-06', 1800)]

  it('uses last Esfand, else the first month of this year', () => {
    expect(yearStartValue(snapshots, '1405-07')).toBe(1000)
    expect(yearStartValue(snapshots.slice(1), '1405-07')).toBe(1500)
    expect(yearStartValue([], '1405-07')).toBeNull()
  })

  it('builds the 12-month series with today live and both hero changes', () => {
    const trend = buildNetWorthTrend({
      snapshots,
      today: { netWorth: 1700, assets: 2000, liabilities: 300 },
      currentMonthKey: '1405-07',
      reasonFor: (monthKey, direction) => `${direction} ${monthKey}`
    })

    expect(trend.points.map(point => [point.monthKey, point.source])).toEqual([
      ['1404-12', 'auto'],
      ['1405-05', 'auto'],
      ['1405-06', 'auto'],
      ['1405-07', 'live']
    ])
    expect(trend.sinceYearStart).toBe(700)
    expect(trend.sincePrevMonth).toBe(-100)
    expect(trend.rises).toEqual([{ monthKey: '1405-06', change: 300, reason: 'rise 1405-06' }])
    expect(trend.falls).toEqual([{ monthKey: '1405-07', change: -100, reason: 'fall 1405-07' }])
  })
})

describe('sheet rows', () => {
  it('round-trips and defaults an unknown source to auto', () => {
    const row = netWorthSnapshotToRow({ ...snap('1405-06', 1200, 'manual'), liabilities: 50 })

    expect(row).toEqual(['1405-06', '1200', '1200', '50', '', 'manual'])
    expect(rowToNetWorthSnapshot(row)?.source).toBe('manual')
    expect(rowToNetWorthSnapshot(['1405-06', '1', '1', '0', '', 'x'])?.source).toBe('auto')
    expect(rowToNetWorthSnapshot(['bad', '1'])).toBeNull()
  })
})
