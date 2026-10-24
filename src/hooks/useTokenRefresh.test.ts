import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  TRANSIENT_BACKOFF_MS,
  TRANSIENT_GIVE_UP_MS,
  TRANSIENT_STEADY_MS,
  transientRetryDelayMs,
  useTokenRefresh
} from './useTokenRefresh'
import { FULL_GOOGLE_OAUTH_SCOPE, saveSession } from '../services/auth'
import {
  getTransientStreak,
  recordRefreshOutcome,
  resetRefreshStatus,
  transientOnlineForMs,
  type RefreshOutcome
} from '../services/refreshStatus'

const refresh = vi.fn()

vi.mock('../services/tokenRefresh', () => ({
  refreshAccessTokenSilently: (...args: unknown[]) => refresh(...args)
}))

vi.mock('../services/googleAuthNative', () => ({ isNativePlatform: () => false }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const onRefreshFailed = vi.fn()

const onRefreshSuccess = vi.fn()

let root: Root

function Probe() {
  useTokenRefresh({ clientId: 'client', enabled: true, onRefreshFailed, onRefreshSuccess })

  return null
}

function seedSession(tokenExpiry: number): void {
  saveSession({
    email: 'a@example.com',
    name: 'A',
    accessToken: 'token',
    tokenExpiry,
    scope: FULL_GOOGLE_OAUTH_SCOPE
  })
}

/** Every renewal ends with `outcome`, as the real one records it. */
function renewalsEndWith(outcome: RefreshOutcome): void {
  refresh.mockImplementation(async () => {
    recordRefreshOutcome(outcome)
    if (outcome === 'ok') seedSession(Date.now() + 3_600_000)

    return outcome === 'ok'
  })
}

const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

describe('useTokenRefresh when renewal gets no answer', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    localStorage.clear()
    refresh.mockReset()
    onRefreshFailed.mockReset()
    onRefreshSuccess.mockReset()
    resetRefreshStatus()
    seedSession(Date.now() - 1000)
    root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
  })

  it('has pauses of 15 s, 30 s and 60 s, then five minutes', () => {
    expect([1, 2, 3, 4, 9].map(transientRetryDelayMs)).toEqual([
      ...TRANSIENT_BACKOFF_MS,
      TRANSIENT_STEADY_MS,
      TRANSIENT_STEADY_MS
    ])
  })

  it('tries again with growing pauses and never calls the session expired meanwhile', async () => {
    renewalsEndWith('transient')

    await advance(0)
    expect(refresh).toHaveBeenCalledTimes(1)

    await advance(14_999)
    expect(refresh).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(refresh).toHaveBeenCalledTimes(2)

    await advance(30_000)
    expect(refresh).toHaveBeenCalledTimes(3)
    await advance(60_000)
    expect(refresh).toHaveBeenCalledTimes(4)

    await advance(TRANSIENT_STEADY_MS - 1)
    expect(refresh).toHaveBeenCalledTimes(4)
    await advance(1)
    expect(refresh).toHaveBeenCalledTimes(5)

    expect(onRefreshFailed).not.toHaveBeenCalled()
  })

  it('stops retrying and reports the session expired after ten minutes of silence while online', async () => {
    renewalsEndWith('transient')

    await advance(TRANSIENT_GIVE_UP_MS + TRANSIENT_STEADY_MS)

    expect(onRefreshFailed).toHaveBeenCalledTimes(1)

    const calls = refresh.mock.calls.length

    await advance(TRANSIENT_STEADY_MS * 3)
    expect(refresh).toHaveBeenCalledTimes(calls)
  })

  it('does not call the session expired just because the computer slept for hours', async () => {
    renewalsEndWith('transient')

    await advance(0)
    await advance(TRANSIENT_BACKOFF_MS[0])
    expect(refresh).toHaveBeenCalledTimes(2)

    // The laptop lid is closed; the pending 30 s timer fires hours later.
    vi.setSystemTime(Date.now() + 3 * 3_600_000)
    await advance(TRANSIENT_BACKOFF_MS[1])
    expect(refresh).toHaveBeenCalledTimes(3)
    expect(onRefreshFailed).not.toHaveBeenCalled()
    expect(transientOnlineForMs()).toBe(0)

    // The pauses start again from 15 seconds.
    await advance(TRANSIENT_BACKOFF_MS[0] - 1)
    expect(refresh).toHaveBeenCalledTimes(3)
    await advance(1)
    expect(refresh).toHaveBeenCalledTimes(4)
    expect(onRefreshFailed).not.toHaveBeenCalled()
  })

  it('counts one attempt and keeps one timer when two runs overlap on the same request', async () => {
    let open: (ok: boolean) => void = () => undefined

    const gate = new Promise<boolean>(resolve => (open = resolve))

    refresh.mockImplementation(() => gate)

    await advance(0)
    await act(async () => void window.dispatchEvent(new Event('online')))
    expect(refresh).toHaveBeenCalledTimes(2)

    recordRefreshOutcome('transient')
    open(false)
    await advance(0)
    expect(getTransientStreak()).toBe(1)

    refresh.mockClear()
    renewalsEndWith('transient')
    await advance(TRANSIENT_BACKOFF_MS[0])
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('asks at once, and forced, when the connection comes back', async () => {
    renewalsEndWith('transient')
    await advance(0)
    refresh.mockClear()

    await act(async () => void window.dispatchEvent(new Event('online')))

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledWith('client', true)
  })

  it('reports the session expired at once when Google refuses', async () => {
    renewalsEndWith('denied')

    await advance(0)

    expect(onRefreshFailed).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('tells the app when a retry finally works', async () => {
    renewalsEndWith('transient')
    await advance(0)
    renewalsEndWith('ok')

    await advance(15_000)

    expect(onRefreshSuccess).toHaveBeenCalledTimes(1)
    expect(onRefreshFailed).not.toHaveBeenCalled()
  })
})
