import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchTgjuPrices,
  isTgjuCoolingDown,
  resetTgjuQuotesState,
  TGJU_PRICE_FAILED_MESSAGE,
  TgjuPriceError
} from './tgju'

const KEYS = { nim: 'nim' }

const okResponse = () =>
  ({ ok: true, json: async () => ({ current: { nim: { p: '450000000' } } }) } as Response)

describe('tgju quotes after a failure', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-28T10:00:00'))
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    resetTgjuQuotesState()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sends one request for many calls in a row, each failing with the fixed message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const calls = await Promise.allSettled(
      Array.from({ length: 50 }, async () => {
        await Promise.resolve()

        return fetchTgjuPrices(KEYS)
      })
    )

    for (let i = 0; i < 50; i += 1) await fetchTgjuPrices(KEYS).catch(() => null)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(isTgjuCoolingDown()).toBe(true)
    expect(calls.every(call => call.status === 'rejected')).toBe(true)
    await expect(fetchTgjuPrices(KEYS)).rejects.toThrow(TGJU_PRICE_FAILED_MESSAGE)
    await expect(fetchTgjuPrices(KEYS)).rejects.toBeInstanceOf(TgjuPriceError)
  })

  it('treats a non-OK answer like a failure', async () => {
    fetchMock.mockResolvedValue({ ok: false } as Response)

    await fetchTgjuPrices(KEYS).catch(() => null)
    await fetchTgjuPrices(KEYS).catch(() => null)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('asks again after the cooldown, and waits longer after a repeated failure', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    await fetchTgjuPrices(KEYS).catch(() => null)
    vi.setSystemTime(Date.now() + 61_000)
    await fetchTgjuPrices(KEYS).catch(() => null)

    expect(fetchMock).toHaveBeenCalledTimes(2)

    // The second failure doubles the wait: 61 s later is still inside it.
    vi.setSystemTime(Date.now() + 61_000)
    await fetchTgjuPrices(KEYS).catch(() => null)

    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.setSystemTime(Date.now() + 60_000)
    await fetchTgjuPrices(KEYS).catch(() => null)

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('lets the manual refresh through, and a success ends the cooldown', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(okResponse())

    await fetchTgjuPrices(KEYS).catch(() => null)

    expect(isTgjuCoolingDown()).toBe(true)
    expect(await fetchTgjuPrices(KEYS, { force: true })).toEqual({ nim: 45_000_000 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(isTgjuCoolingDown()).toBe(false)
  })

  it('serves the last quotes during a cooldown instead of failing', async () => {
    fetchMock.mockResolvedValueOnce(okResponse()).mockRejectedValue(new Error('offline'))

    await fetchTgjuPrices(KEYS)
    vi.setSystemTime(Date.now() + 6 * 60_000)
    await expect(fetchTgjuPrices(KEYS)).rejects.toBeInstanceOf(TgjuPriceError)

    expect(await fetchTgjuPrices(KEYS)).toEqual({ nim: 45_000_000 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
