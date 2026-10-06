import { beforeEach, describe, expect, it } from 'vitest'

import {
  FREE_UNLOCK_ATTEMPTS,
  getRemainingUnlockAttempts,
  getUnlockLockoutRemainingMs,
  recordFailedUnlock,
  resetUnlockAttempts,
  UNLOCK_ATTEMPTS_KEY
} from './appLockAttempts'

const NOW = 1_700_000_000_000

function failTimes(count: number, now = NOW): number {
  let last = 0

  for (let i = 0; i < count; i++) last = recordFailedUnlock(now)

  return last
}

describe('unlock attempt lockout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('allows the free attempts without a lockout', () => {
    expect(failTimes(FREE_UNLOCK_ATTEMPTS - 1)).toBe(0)
    expect(getUnlockLockoutRemainingMs(NOW)).toBe(0)
    expect(getRemainingUnlockAttempts()).toBe(1)
  })

  it('escalates 30s, 60s, 5min, then stays at 15min', () => {
    expect(failTimes(FREE_UNLOCK_ATTEMPTS)).toBe(30_000)
    expect(recordFailedUnlock(NOW)).toBe(60_000)
    expect(recordFailedUnlock(NOW)).toBe(300_000)
    expect(recordFailedUnlock(NOW)).toBe(900_000)
    expect(recordFailedUnlock(NOW)).toBe(900_000)
  })

  it('persists the lockout and counts it down', () => {
    failTimes(FREE_UNLOCK_ATTEMPTS)

    expect(localStorage.getItem(UNLOCK_ATTEMPTS_KEY)).not.toBeNull()
    expect(getUnlockLockoutRemainingMs(NOW + 10_000)).toBe(20_000)
    expect(getUnlockLockoutRemainingMs(NOW + 30_000)).toBe(0)
  })

  it('caps the remaining time when the clock moves backwards', () => {
    failTimes(FREE_UNLOCK_ATTEMPTS)

    expect(getUnlockLockoutRemainingMs(NOW - 365 * 86_400_000)).toBe(900_000)
  })

  it('clears everything after a successful unlock', () => {
    failTimes(FREE_UNLOCK_ATTEMPTS + 2)
    resetUnlockAttempts()

    expect(getUnlockLockoutRemainingMs(NOW)).toBe(0)
    expect(getRemainingUnlockAttempts()).toBe(FREE_UNLOCK_ATTEMPTS)
  })
})
