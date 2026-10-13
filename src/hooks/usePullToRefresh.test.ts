import { describe, expect, it } from 'vitest'

import {
  PULL_MAX,
  PULL_THRESHOLD,
  pullDistance,
  pullPhase,
  resolvePullIntent
} from './usePullToRefresh'

describe('pullDistance', () => {
  it('grows at half the finger speed and never for upward drags', () => {
    expect(pullDistance(-40)).toBe(0)
    expect(pullDistance(0)).toBe(0)
    expect(pullDistance(100)).toBe(50)
  })

  it('caps the row height', () => {
    expect(pullDistance(1000)).toBe(PULL_MAX)
  })
})

describe('pullPhase', () => {
  it('is ready only from the 64px threshold on', () => {
    expect(PULL_THRESHOLD).toBe(64)
    expect(pullPhase(0)).toBe('idle')
    expect(pullPhase(63)).toBe('pulling')
    expect(pullPhase(64)).toBe('ready')
    expect(pullPhase(pullDistance(126))).toBe('pulling')
    expect(pullPhase(pullDistance(128))).toBe('ready')
  })
})

describe('resolvePullIntent', () => {
  it('waits until the finger moves past the slop', () => {
    expect(resolvePullIntent(3, 5)).toBeNull()
  })

  it('treats a mostly vertical drag down as a pull', () => {
    expect(resolvePullIntent(4, 20)).toBe('pull')
  })

  it('leaves upward and sideways drags to the browser', () => {
    expect(resolvePullIntent(0, -20)).toBe('scroll')
    expect(resolvePullIntent(30, 12)).toBe('scroll')
  })
})
