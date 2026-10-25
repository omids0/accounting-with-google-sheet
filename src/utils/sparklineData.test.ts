import { describe, expect, it } from 'vitest'

import { SPARKLINE_MAX_POINTS, distributionSparkline, downsampleSparkline } from './sparklineData'

function series(length: number, seed = 7): number[] {
  let state = seed

  return Array.from({ length }, () => {
    state = (state * 1103515245 + 12345) % 2147483648

    return (state % 100000) / 10
  })
}

describe('downsampleSparkline', () => {
  it('leaves a series that already fits untouched', () => {
    const values = series(SPARKLINE_MAX_POINTS)

    expect(downsampleSparkline(values)).toEqual(values)
    expect(downsampleSparkline([1, 2])).toEqual([1, 2])
    expect(downsampleSparkline([])).toEqual([])
  })

  it('thins thousands of values to the cap, keeping the ends and the order', () => {
    const values = series(8457)
    const sampled = downsampleSparkline(values)

    expect(sampled).toHaveLength(SPARKLINE_MAX_POINTS)
    expect(sampled[0]).toBe(values[0])
    expect(sampled[sampled.length - 1]).toBe(values[values.length - 1])

    // every kept value is a real value, in the original order (a subsequence)
    let cursor = 0

    for (const value of sampled) {
      cursor = values.indexOf(value, cursor)
      expect(cursor).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps a lone spike and a lone dip visible', () => {
    const values = Array.from({ length: 5000 }, () => 100)

    values[1234] = 9000
    values[3999] = -4000

    const sampled = downsampleSparkline(values)

    expect(Math.max(...sampled)).toBe(9000)
    expect(Math.min(...sampled)).toBe(-4000)
  })

  it('honours a custom cap and never goes below the three points it needs', () => {
    expect(downsampleSparkline(series(500), 10)).toHaveLength(10)
    expect(downsampleSparkline(series(500), 2)).toHaveLength(500)
  })
})

describe('distributionSparkline', () => {
  it('drops non-finite values and keeps the rest as they are for short series', () => {
    expect(distributionSparkline([1, Number.NaN, 3, Infinity, 5])).toEqual([1, 3, 5])
  })

  it('caps long series so one point per record is never drawn', () => {
    const values = series(30000)

    values[10] = Number.NaN

    const sampled = distributionSparkline(values)

    expect(sampled).toHaveLength(SPARKLINE_MAX_POINTS)
    expect(sampled.every(Number.isFinite)).toBe(true)
  })
})
