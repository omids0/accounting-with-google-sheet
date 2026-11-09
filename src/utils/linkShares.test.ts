import { describe, expect, it } from 'vitest'

import { autoFillShares, sharesProblem, sharesSum } from './linkShares'

const debts = [
  { id: 'a', remaining: 1_200_000 },
  { id: 'b', remaining: 1_000_000 },
  { id: 'c', remaining: 2_500_000 }
]

describe('autoFillShares', () => {
  it('fills the picked items oldest first, each up to what is left on it', () => {
    expect(autoFillShares(debts, ['a', 'b', 'c'], 3_000_000)).toEqual({
      a: 1_200_000,
      b: 1_000_000,
      c: 800_000
    })
  })

  it('skips items nobody picked', () => {
    expect(autoFillShares(debts, ['b', 'c'], 3_000_000)).toEqual({ b: 1_000_000, c: 2_000_000 })
  })

  it('gives a single pick the whole amount when it fits', () => {
    expect(autoFillShares(debts, ['c'], 900_000)).toEqual({ c: 900_000 })
  })

  it('leaves the surplus unplaced when the picks cannot take it all', () => {
    const shares = autoFillShares(debts, ['a', 'b'], 3_000_000)

    expect(shares).toEqual({ a: 1_200_000, b: 1_000_000 })
    expect(sharesSum(shares)).toBe(2_200_000)
  })

  it('gives the later items nothing once the amount is used up (zero, not missing)', () => {
    expect(autoFillShares(debts, ['a', 'b'], 500_000)).toEqual({ a: 500_000, b: 0 })
  })

  it('keeps fractions free of binary noise', () => {
    const shares = autoFillShares(
      [
        { id: 'x', remaining: 0.1 },
        { id: 'y', remaining: 0.2 }
      ],
      ['x', 'y'],
      0.3
    )

    expect(sharesSum(shares)).toBe(0.3)
  })
})

describe('sharesProblem', () => {
  it('is null with nothing picked: the record stays a plain one', () => {
    expect(sharesProblem(debts, {}, 3_000_000)).toBeNull()
  })

  it('is null when the shares add up to the amount', () => {
    expect(
      sharesProblem(debts, { a: 1_200_000, b: 1_800_000 - 800_000, c: 800_000 }, 3_000_000)
    ).toBeNull()
  })

  it('names a share above what is left on its item', () => {
    expect(sharesProblem(debts, { a: 1_500_000, c: 1_500_000 }, 3_000_000)).toEqual({
      kind: 'over',
      id: 'a',
      remaining: 1_200_000
    })
  })

  it('names a picked item with no amount', () => {
    expect(sharesProblem(debts, { a: 0, c: 3_000_000 }, 3_000_000)).toEqual({
      kind: 'empty',
      id: 'a'
    })
  })

  it('tells how much is left when the shares fall short', () => {
    expect(sharesProblem(debts, { a: 1_200_000, b: 1_000_000 }, 3_000_000)).toEqual({
      kind: 'sum',
      diff: 800_000
    })
  })

  it('tells how much is too much (negative) when the shares exceed the amount', () => {
    expect(sharesProblem(debts, { a: 1_200_000, c: 2_500_000 }, 3_000_000)).toEqual({
      kind: 'sum',
      diff: -700_000
    })
  })
})
