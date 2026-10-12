import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getLockPolicy,
  markBackgroundPending,
  markForegroundReturn,
  markSessionUnlocked,
  setLockPolicy,
  shouldLockOnForeground,
  touchActivity
} from './appLockPolicy'

vi.mock('./appLock', () => ({ isAppLockEnabled: () => true }))

vi.mock('./settings', () => ({ getSettings: () => ({ spreadsheetId: 'sheet-1' }) }))

const MINUTE = 60_000

function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms)
}

/** Mirrors useAppLock: a return that does not lock settles the background marker. */
function returnToApp(): boolean {
  if (shouldLockOnForeground()) return true

  markForegroundReturn()

  return false
}

describe('idle lock policy', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
    setLockPolicy('idle', 5, true)
    markSessionUnlocked()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is the default for a device without a stored policy', () => {
    localStorage.clear()

    expect(getLockPolicy()).toBe('idle')
  })

  it('does not lock after a short trip, nor later while the user is active', () => {
    markBackgroundPending()
    advance(10_000)

    expect(returnToApp()).toBe(false)

    for (let minute = 0; minute < 10; minute++) {
      advance(MINUTE)
      touchActivity()

      expect(shouldLockOnForeground()).toBe(false)
    }
  })

  it('locks when the app stayed hidden longer than the idle time', () => {
    markBackgroundPending()
    advance(5 * MINUTE + 1_000)

    expect(returnToApp()).toBe(true)
  })

  it('locks after the idle time without activity in the foreground', () => {
    advance(4 * MINUTE)

    expect(shouldLockOnForeground()).toBe(false)

    advance(MINUTE + 1_000)

    expect(shouldLockOnForeground()).toBe(true)
  })

  it('counts idle time from the return, not from before the trip', () => {
    advance(4 * MINUTE)
    markBackgroundPending()
    advance(30_000)

    expect(returnToApp()).toBe(false)

    advance(2 * MINUTE)

    expect(shouldLockOnForeground()).toBe(false)
  })
})
