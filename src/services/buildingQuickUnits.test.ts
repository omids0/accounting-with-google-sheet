import { describe, expect, it } from 'vitest'

import { defaultRanges, planQuickUnits, rangeEndOptions, setRangeEnd } from './buildingQuickUnits'

const ends = (ranges: { to: number }[]) => ranges.map(range => range.to)

describe('defaultRanges', () => {
  it('spreads 12 units over 4 floors as 3 each', () => {
    const ranges = defaultRanges(12, 4)

    expect(ranges.map(range => [range.from, range.to])).toEqual([
      [1, 3],
      [4, 6],
      [7, 9],
      [10, 12]
    ])
  })

  it('gives the earlier floors the extra units', () => {
    expect(ends(defaultRanges(10, 4))).toEqual([3, 6, 8, 10])
  })

  it('always ends at the total', () => {
    for (const [total, floors] of [
      [7, 3],
      [1, 4],
      [20, 6],
      [5, 5]
    ]) {
      expect(defaultRanges(total, floors).at(-1)?.to).toBe(total)
    }
  })
})

describe('setRangeEnd', () => {
  it('redistributes the later floors and keeps the last one at the total', () => {
    const moved = setRangeEnd(defaultRanges(12, 4), 0, 5, 12)

    expect(moved.map(range => [range.from, range.to])).toEqual([
      [1, 5],
      [6, 8],
      [9, 10],
      [11, 12]
    ])
  })

  it('never lets a floor end before it starts or after the total', () => {
    const ranges = defaultRanges(12, 4)

    expect(setRangeEnd(ranges, 1, 2, 12)[1].to).toBe(4)
    expect(setRangeEnd(ranges, 1, 99, 12)[1].to).toBe(12)
  })

  it('leaves later floors empty when nothing is left for them', () => {
    const moved = setRangeEnd(defaultRanges(12, 4), 0, 12, 12)

    expect(moved[0].to).toBe(12)
    expect(moved.slice(1).every(range => range.to < range.from)).toBe(true)
    expect(moved.at(-1)?.to).toBe(12)
  })

  it('keeps the last floor at the total whatever it is asked for', () => {
    const ranges = defaultRanges(12, 4)

    expect(setRangeEnd(ranges, 3, 5, 12)[3].to).toBe(12)
  })

  it('changes nothing for a floor that does not exist', () => {
    const ranges = defaultRanges(12, 4)

    expect(setRangeEnd(ranges, 9, 5, 12)).toBe(ranges)
  })
})

describe('rangeEndOptions', () => {
  it('offers the floor’s first unit up to the total', () => {
    expect(rangeEndOptions(defaultRanges(12, 4), 2, 12)).toEqual([7, 8, 9, 10, 11, 12])
  })
})

describe('planQuickUnits', () => {
  it('numbers the units 1..total by floor with the reference area', () => {
    const drafts = planQuickUnits(defaultRanges(6, 2), 100)

    expect(drafts.map(draft => draft.number)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(drafts.map(draft => draft.floor)).toEqual([1, 1, 1, 2, 2, 2])
    expect(drafts.every(draft => draft.area === 100)).toBe(true)
  })

  it('takes a unit’s own area over the reference', () => {
    const drafts = planQuickUnits(defaultRanges(4, 2), 100, { '3': 110 })

    expect(drafts.map(draft => draft.area)).toEqual([100, 100, 110, 100])
  })

  it('skips floors without units', () => {
    const drafts = planQuickUnits(setRangeEnd(defaultRanges(4, 2), 0, 4, 4), 90)

    expect(drafts).toHaveLength(4)
    expect(drafts.every(draft => draft.floor === 1)).toBe(true)
  })
})
