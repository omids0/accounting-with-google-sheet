import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SLEEP_GAP_MS,
  STALLED_AFTER_TRANSIENTS,
  getTransientStreak,
  isRefreshStalled,
  lastRefreshWasTransient,
  noteBackoffAttempt,
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

  it('becomes stalled after three timer attempts in a row and clears on success', () => {
    for (let i = 1; i < STALLED_AFTER_TRANSIENTS; i++) noteBackoffAttempt()
    expect(isRefreshStalled()).toBe(false)

    noteBackoffAttempt()
    expect(isRefreshStalled()).toBe(true)

    recordRefreshOutcome('ok')
    expect(isRefreshStalled()).toBe(false)
    expect(getTransientStreak()).toBe(0)
  })

  it('does not count a transient result that did not come from the refresh timer', () => {
    for (let i = 0; i < 10; i++) recordRefreshOutcome('transient')

    expect(lastRefreshWasTransient()).toBe(true)
    expect(getTransientStreak()).toBe(0)
    expect(isRefreshStalled()).toBe(false)
  })

  it('a refusal ends the run: it is an expired session, not "offline"', () => {
    noteBackoffAttempt()
    recordRefreshOutcome('denied')

    expect(getTransientStreak()).toBe(0)
    expect(lastRefreshWasTransient()).toBe(false)
  })

  it('adds up awake online time between the timer attempts', () => {
    noteBackoffAttempt()
    vi.advanceTimersByTime(15_000)
    noteBackoffAttempt()
    vi.advanceTimersByTime(5 * 60_000)
    noteBackoffAttempt()

    expect(transientOnlineForMs()).toBe(15_000 + 5 * 60_000)
    expect(getTransientStreak()).toBe(3)
  })

  it('does not count a sleep as silence: a long gap restarts the count and the pauses', () => {
    noteBackoffAttempt()
    vi.advanceTimersByTime(60_000)
    noteBackoffAttempt()
    noteBackoffAttempt()

    vi.advanceTimersByTime(SLEEP_GAP_MS + 1)
    noteBackoffAttempt()

    expect(transientOnlineForMs()).toBe(0)
    expect(getTransientStreak()).toBe(1)
  })

  it('does not count offline time towards giving up', () => {
    noteBackoffAttempt()
    vi.advanceTimersByTime(5 * 60_000)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    noteBackoffAttempt()

    expect(transientOnlineForMs()).toBe(0)
  })

  it('tells subscribers about every change', () => {
    const listener = vi.fn()

    const unsubscribe = subscribeRefreshStatus(listener)

    noteBackoffAttempt()
    resetRefreshStatus()
    unsubscribe()
    noteBackoffAttempt()

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
