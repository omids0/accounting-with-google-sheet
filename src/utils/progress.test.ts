import { describe, expect, it } from 'vitest'

import { floorPercent, progressPercent } from './progress'

describe('progressPercent', () => {
  it('never rounds 99.5% up to 100', () => {
    expect(progressPercent(995, 1000)).toBe(99)
    expect(progressPercent(999_999, 1_000_000)).toBe(99)
  })

  it('shows 100 only when fully paid', () => {
    expect(progressPercent(1000, 1000)).toBe(100)
    expect(progressPercent(1200, 1000)).toBe(100)
  })

  it('rounds down and absorbs float noise', () => {
    expect(progressPercent(29, 100)).toBe(29)
    expect(progressPercent(0.29, 1)).toBe(29)
    expect(progressPercent(1, 3)).toBe(33)
    expect(progressPercent(2, 3)).toBe(66)
  })

  it('handles empty or invalid totals', () => {
    expect(progressPercent(0, 1000)).toBe(0)
    expect(progressPercent(10, 0)).toBe(0)
    expect(progressPercent(Number.NaN, 10)).toBe(0)
    expect(progressPercent(-5, 10)).toBe(0)
  })
})

describe('floorPercent', () => {
  it('floors and clamps a raw percentage', () => {
    expect(floorPercent(99.5)).toBe(99)
    expect(floorPercent(99.99999999)).toBe(100)
    expect(floorPercent(100)).toBe(100)
    expect(floorPercent(140)).toBe(100)
    expect(floorPercent(-3)).toBe(0)
    expect(floorPercent(Number.NaN)).toBe(0)
  })
})
