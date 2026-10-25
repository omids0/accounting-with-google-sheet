import { beforeEach, describe, expect, it } from 'vitest'

import {
  lastDifferenceChange,
  readDifferenceHistory,
  recordDifference,
  snapshotOf,
  type DifferenceSnapshot
} from './walletDifferenceHistory'

const snap = (at: number, difference: number): DifferenceSnapshot => ({
  at,
  difference,
  walletTotal: 0,
  periodBalance: 0
})

const HOUR = 3_600_000

describe('difference history', () => {
  beforeEach(() => localStorage.clear())

  it('writes a new figure and skips the same one seen again soon', () => {
    recordDifference('s', snap(0, 0))
    recordDifference('s', snap(HOUR, 0))
    recordDifference('s', snap(2 * HOUR, 8_000_000))

    expect(readDifferenceHistory('s').map(item => item.difference)).toEqual([0, 8_000_000])
  })

  it('writes the same figure again after half a day', () => {
    recordDifference('s', snap(0, 5))
    recordDifference('s', snap(13 * HOUR, 5))

    expect(readDifferenceHistory('s')).toHaveLength(2)
  })

  it('works out the difference from the accounts and the period it was compared with', () => {
    const snapshot = snapshotOf(
      [{ balance: 30_000_000 }, { balance: 21_141_233 }],
      { openingBalance: 35_483_233, totalIncome: 7_658_000, totalExpense: 0 },
      7
    )

    expect(snapshot).toEqual({
      at: 7,
      difference: 8_000_000,
      walletTotal: 51_141_233,
      periodBalance: 43_141_233
    })
  })

  it('keeps each spreadsheet apart', () => {
    recordDifference('a', snap(0, 1))
    recordDifference('b', snap(0, 2))

    expect(readDifferenceHistory('a')[0].difference).toBe(1)
    expect(readDifferenceHistory('b')[0].difference).toBe(2)
  })

  it('finds the look before the latest change', () => {
    const history = [snap(1, 0), snap(2, 0), snap(3, 8_000_000), snap(4, 8_000_000)]

    expect(lastDifferenceChange(history)).toEqual({ before: history[1], after: history[2] })
  })

  it('has no change to show while one figure has always been seen', () => {
    expect(lastDifferenceChange([snap(1, 5), snap(2, 5)])).toBeNull()
    expect(lastDifferenceChange([])).toBeNull()
  })
})
