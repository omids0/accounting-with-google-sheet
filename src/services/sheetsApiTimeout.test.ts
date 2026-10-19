import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_TIMEOUT_MS, fetchWithTimeout } from './sheetsApi'

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('cuts a request that never answers instead of waiting forever', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('x', 'AbortError'))
            )
          })
      )
    )

    const request = fetchWithTimeout('https://example.test', {})
    const failure = expect(request).rejects.toThrow('زمان انتظار تمام شد')

    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1)
    await failure
  })

  it('returns the response of a request that answers in time', async () => {
    const response = new Response('{}')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    expect(await fetchWithTimeout('https://example.test', {})).toBe(response)
  })
})
