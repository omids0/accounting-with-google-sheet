import { describe, expect, it } from 'vitest'

import { resolveEqualWeights, resolveManualWeights, splitExpenseShares } from './dangSplitMath'
import type { DangSplitPerson } from '../types/dangSplit'

function person(id: string, overrides: Partial<DangSplitPerson> = {}): DangSplitPerson {
  return {
    id,
    groupId: 'g1',
    name: id,
    categoryId: '',
    defaultWeight: 1,
    paidAmount: 0,
    settledAt: '',
    note: '',
    ...overrides
  }
}

describe('splitExpenseShares', () => {
  it('splits equally when weights are equal', () => {
    const shares = splitExpenseShares(300_000, [
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 1 },
      { personId: 'c', weight: 1 }
    ])

    expect(shares.get('a')).toBe(100_000)
    expect(shares.get('b')).toBe(100_000)
    expect(shares.get('c')).toBe(100_000)
  })

  it('keeps the sum of shares exactly equal to the amount when it does not divide evenly', () => {
    const shares = splitExpenseShares(10_000, [
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 1 },
      { personId: 'c', weight: 1 }
    ])

    const total = [...shares.values()].reduce((sum, value) => sum + value, 0)

    expect(total).toBe(10_000)
    expect([...shares.values()].sort((a, b) => a - b)).toEqual([3_333, 3_333, 3_334])
  })

  it('gives the remainder to the largest share', () => {
    const shares = splitExpenseShares(1_000, [
      { personId: 'a', weight: 2 },
      { personId: 'b', weight: 1 }
    ])

    expect(shares.get('a')).toBe(667)
    expect(shares.get('b')).toBe(333)
  })

  it('weights shares proportionally', () => {
    const shares = splitExpenseShares(400_000, [
      { personId: 'a', weight: 2 },
      { personId: 'b', weight: 1 },
      { personId: 'c', weight: 1 }
    ])

    expect(shares.get('a')).toBe(200_000)
    expect(shares.get('b')).toBe(100_000)
    expect(shares.get('c')).toBe(100_000)
  })

  it('falls back to an equal split when every weight is zero', () => {
    const shares = splitExpenseShares(300, [
      { personId: 'a', weight: 0 },
      { personId: 'b', weight: 0 }
    ])

    expect(shares.get('a')).toBe(150)
    expect(shares.get('b')).toBe(150)
  })

  it('returns an empty map when nobody is allocated', () => {
    expect(splitExpenseShares(500, []).size).toBe(0)
  })
})

describe('resolveEqualWeights', () => {
  it('uses each person default weight', () => {
    expect(resolveEqualWeights([person('a'), person('b', { defaultWeight: 2 })])).toEqual([
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 2 }
    ])
  })

  it('treats a non-positive default weight as one', () => {
    expect(resolveEqualWeights([person('a', { defaultWeight: 0 })])).toEqual([
      { personId: 'a', weight: 1 }
    ])
  })
})

describe('resolveManualWeights', () => {
  it('spreads the remaining percentage over the other people by default weight', () => {
    const weights = resolveManualWeights(
      [person('a'), person('b'), person('c', { defaultWeight: 2 })],
      { a: 40 }
    )

    expect(weights).toEqual([
      { personId: 'a', weight: 40 },
      { personId: 'b', weight: 20 },
      { personId: 'c', weight: 40 }
    ])
  })

  it('gives everyone their manual percentage when all are manual', () => {
    expect(resolveManualWeights([person('a'), person('b')], { a: 70, b: 30 })).toEqual([
      { personId: 'a', weight: 70 },
      { personId: 'b', weight: 30 }
    ])
  })

  it('leaves no share for the others when the manual percentages reach 100', () => {
    expect(resolveManualWeights([person('a'), person('b')], { a: 100 })).toEqual([
      { personId: 'a', weight: 100 },
      { personId: 'b', weight: 0 }
    ])
  })

  it('keeps the manual percentages proportional when they exceed 100', () => {
    const weights = resolveManualWeights([person('a'), person('b')], { a: 80, b: 40 })
    const shares = splitExpenseShares(120_000, weights)

    expect(shares.get('a')).toBe(80_000)
    expect(shares.get('b')).toBe(40_000)
  })

  it('falls back to the equal split when no manual percentage is given', () => {
    expect(resolveManualWeights([person('a'), person('b', { defaultWeight: 3 })], {})).toEqual([
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 3 }
    ])
  })
})
