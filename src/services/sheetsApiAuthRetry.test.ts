import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AuthModule from './auth'

const forceRefreshAccessToken = vi.fn()

vi.mock('./tokenRefresh', () => ({ forceRefreshAccessToken }))

let accessToken = 'stale'

vi.mock('./auth', () => ({ getAccessToken: () => accessToken, isTokenValid: () => true }))

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

const EXPIRED = {
  error: {
    message:
      'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.'
  }
}

describe('sheets requests with a rejected token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessToken = 'stale'
  })

  it('renews the token and repeats the request once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401, EXPIRED))
      .mockResolvedValueOnce(response(200, { values: [['ok']] }))

    vi.stubGlobal('fetch', fetchMock)
    forceRefreshAccessToken.mockImplementation(async () => {
      accessToken = 'fresh'

      return true
    })

    const { apiRequest } = await import('./sheetsApi')

    await expect(apiRequest('https://example.test')).resolves.toEqual({ values: [['ok']] })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      (fetchMock.mock.calls[1][1] as { headers: Record<string, string> }).headers.Authorization
    ).toBe('Bearer fresh')
  })

  it('reports an auth error the handler can recognise when the renewal fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, EXPIRED)))
    forceRefreshAccessToken.mockResolvedValue(false)

    const { apiRequest } = await import('./sheetsApi')

    const { isAuthError } = await vi.importActual<typeof AuthModule>('./auth')

    await expect(apiRequest('https://example.test')).rejects.toSatisfy((err: unknown) =>
      isAuthError(err)
    )
  })

  it('does not renew twice for one request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(401, EXPIRED))

    vi.stubGlobal('fetch', fetchMock)
    forceRefreshAccessToken.mockResolvedValue(true)

    const { apiRequest } = await import('./sheetsApi')

    await expect(apiRequest('https://example.test')).rejects.toThrow()

    expect(forceRefreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
