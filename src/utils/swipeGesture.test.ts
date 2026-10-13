import { describe, expect, it } from 'vitest'

import {
  lockSwipeAxis,
  SWIPE_MIN_PX,
  swipeOffset,
  swipeOutcome,
  swipeThreshold
} from './swipeGesture'

const both = { right: true, left: true }

describe('lockSwipeAxis', () => {
  it('waits for the slop before deciding', () => {
    expect(lockSwipeAxis(4, 3)).toBeNull()
  })

  it('locks sideways only for a clearly horizontal move', () => {
    expect(lockSwipeAxis(30, 5)).toBe('x')
    expect(lockSwipeAxis(-30, 10)).toBe('x')
    expect(lockSwipeAxis(20, 18)).toBe('y')
    expect(lockSwipeAxis(2, 40)).toBe('y')
  })
})

describe('swipeThreshold', () => {
  it('is 35% of the card but never below the minimum', () => {
    expect(swipeThreshold(400)).toBe(140)
    expect(swipeThreshold(100)).toBe(SWIPE_MIN_PX)
  })
})

describe('swipeOffset', () => {
  it('does not move toward a side without an action', () => {
    expect(swipeOffset(50, { right: false, left: true })).toBe(0)
    expect(swipeOffset(-50, { right: false, left: true })).toBe(-50)
  })
})

describe('swipeOutcome', () => {
  it('acts only past the threshold, in screen direction', () => {
    expect(swipeOutcome(139, 400, both)).toBeNull()
    expect(swipeOutcome(140, 400, both)).toBe('right')
    expect(swipeOutcome(-160, 400, both)).toBe('left')
  })

  it('ignores a long drag toward a side without an action', () => {
    expect(swipeOutcome(300, 400, { right: false, left: true })).toBeNull()
  })
})
