import { describe, expect, it } from 'vitest'

import { scrollDeltaToReveal } from './useScrollActiveIntoView'

// A 715px menu column starting at y=52 (the 1280x800 sidebar).
const box = { top: 52, bottom: 767 }
const row = (top: number) => ({ top, bottom: top + 40 })

describe('scrollDeltaToReveal', () => {
  it('does not scroll while the link has room on both sides', () => {
    expect(scrollDeltaToReveal(box, row(305))).toBe(0)
    expect(scrollDeltaToReveal(box, row(76))).toBe(0)
    expect(scrollDeltaToReveal(box, row(703))).toBe(0)
  })

  it('centers a link that sits below the fold', () => {
    // «تنظیمات» at 754..794, behind the footer: centered = 774 - 409.5 below the middle.
    expect(scrollDeltaToReveal(box, row(754))).toBe(364.5)
  })

  it('centers a link that is half hidden at the bottom edge', () => {
    expect(scrollDeltaToReveal(box, row(711))).toBeGreaterThan(0)
  })

  it('scrolls up for a link hidden above the column', () => {
    expect(scrollDeltaToReveal(box, row(20))).toBeLessThan(0)
  })
})
