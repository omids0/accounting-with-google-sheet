import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  STALLED_AFTER_TRANSIENTS,
  getTransientStreak,
  isRefreshStalled,
  lastRefreshWasTransient,
  recordRefreshOutcome,
  resetRefreshStatus,
  subscribeRefreshStatus,
  transientOnlineForMs
} from './refreshStatus'

describe('refreshStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetRefreshStatus()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('becomes stalled after three transient results in a row and clears on success', () => {
    for (let i = 1; i < STALLED_AFTER_TRANSIENTS; i++) recordRefreshOutcome('transient')
    expect(isRefreshStalled()).toBe(false)

    recordRefreshOutcome('transient')
    expect(isRefreshStalled()).toBe(true)
    expect(lastRefreshWasTransient()).toBe(true)

    recordRefreshOutcome('ok')
    expect(isRefreshStalled()).toBe(false)
    expect(getTransientStreak()).toBe(0)
  })

  it('a refusal ends the run: it is an expired session, not "offline"', () => {
    recordRefreshOutcome('transient')
    recordRefreshOutcome('denied')

    expect(getTransientStreak()).toBe(0)
    expect(lastRefreshWasTransient()).toBe(false)
  })

  it('measures an unbroken run of no-answer results while online only', () => {
    recordRefreshOutcome('transient')
    vi.advanceTimersByTime(5 * 60_000)
    expect(transientOnlineForMs()).toBe(5 * 60_000)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    recordRefreshOutcome('transient')
    // Offline time cannot count towards giving up.
    expect(transientOnlineForMs()).toBe(0)
  })

  it('tells subscribers about every change', () => {
    const listener = vi.fn()

    const unsubscribe = subscribeRefreshStatus(listener)

    recordRefreshOutcome('transient')
    resetRefreshStatus()
    unsubscribe()
    recordRefreshOutcome('transient')

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
