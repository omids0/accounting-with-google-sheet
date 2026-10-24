import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWebSignIn } from './useWebSignIn'
import { FULL_GOOGLE_OAUTH_SCOPE } from '../../services/auth'

const showInfo = vi.fn()

const showError = vi.fn()

vi.mock('../../utils/toast', () => ({
  showInfo: (message: string) => showInfo(message),
  showError: (message: string) => showError(message)
}))

vi.mock('../../services/googleAuthNative', () => ({ isNativePlatform: () => false }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type CodeConfig = { callback: (response: { code?: string }) => void }

const fetchMock = vi.fn()

const requestAccessToken = vi.fn()

const requestCode = vi.fn()

const initTokenClient = vi.fn(() => ({ requestAccessToken }))

let codeCallback: CodeConfig['callback'] | undefined

let latest: ReturnType<typeof useWebSignIn>

let root: Root

const complete = vi.fn(async () => undefined)

function Probe() {
  latest = useWebSignIn(complete, vi.fn())

  return null
}

describe('useWebSignIn with the refresh-token worker configured', () => {
  beforeEach(async () => {
    complete.mockClear()
    showInfo.mockReset()
    showError.mockReset()
    initTokenClient.mockClear()
    requestAccessToken.mockClear()
    requestCode.mockClear()
    codeCallback = undefined
    vi.stubEnv('VITE_AUTH_WORKER_URL', 'https://auth.example.workers.dev')
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id')
    vi.stubGlobal('fetch', fetchMock)
    window.google = {
      accounts: {
        oauth2: {
          initCodeClient: (config: CodeConfig) => {
            codeCallback = config.callback

            return { requestCode }
          },
          initTokenClient
        }
      }
    } as unknown as Window['google']
    root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    delete window.google
  })

  it('uses the code popup and is ready once the script is there', () => {
    expect(latest.ready).toBe(true)
    expect(codeCallback).toBeTypeOf('function')

    latest.login()
    expect(requestCode).toHaveBeenCalledTimes(1)
    expect(requestAccessToken).not.toHaveBeenCalled()
  })

  it('completes the sign-in with the access token and worker session the exchange returns', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/exchange')
        ? new Response(
            JSON.stringify({
              access_token: 'access',
              expires_in: 3599,
              scope: FULL_GOOGLE_OAUTH_SCOPE,
              sessionId: 'S'.repeat(43)
            })
          )
        : new Response(JSON.stringify({ email: 'a@example.com', name: 'A' }))
    )

    await act(async () => codeCallback?.({ code: 'the-code' }))

    expect(fetchMock.mock.calls[0][0]).toBe('https://auth.example.workers.dev/exchange')
    expect(complete).toHaveBeenCalledWith(
      'access',
      { email: 'a@example.com', name: 'A', picture: undefined },
      3599,
      FULL_GOOGLE_OAUTH_SCOPE,
      'S'.repeat(43)
    )
  })

  it('forgets the worker copy, without revoking, when the user left drive.file unticked', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/exchange')
        ? new Response(
            JSON.stringify({
              access_token: 'access',
              scope: 'openid email',
              sessionId: 'S'.repeat(43)
            })
          )
        : new Response('{}')
    )

    await act(async () => codeCallback?.({ code: 'the-code' }))

    const logout = fetchMock.mock.calls.find(call => String(call[0]).endsWith('/logout'))

    expect(JSON.parse((logout?.[1] as RequestInit).body as string)).toEqual({
      sessionId: 'S'.repeat(43),
      revoke: false
    })
    expect(complete).not.toHaveBeenCalled()
  })

  it('forgets the worker copy when the profile cannot be read', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/exchange')
        ? new Response(
            JSON.stringify({
              access_token: 'access',
              scope: FULL_GOOGLE_OAUTH_SCOPE,
              sessionId: 'S'.repeat(43)
            })
          )
        : new Response('{}', { status: 401 })
    )

    await act(async () => codeCallback?.({ code: 'the-code' }))

    expect(fetchMock.mock.calls.some(call => String(call[0]).endsWith('/logout'))).toBe(true)
    expect(complete).not.toHaveBeenCalled()
  })

  it('falls back to the token sign-in, with a toast, when the worker cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await act(async () => codeCallback?.({ code: 'the-code' }))

    expect(showInfo).toHaveBeenCalledWith('ورود با روش جایگزین؛ دوباره روی «ورود با Google» بزنید.')
    expect(showError).not.toHaveBeenCalled()
    // The next click opens Google's token popup instead of the code popup.
    latest.login()
    expect(requestAccessToken).toHaveBeenCalledTimes(1)
    expect(requestCode).not.toHaveBeenCalled()
    expect(complete).not.toHaveBeenCalled()
  })

  it('does not fall back for an expired code: that is the user, not the worker', async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
    )

    await act(async () => codeCallback?.({ code: 'old-code' }))

    expect(showError).toHaveBeenCalledWith('کد ورود منقضی شد. دوباره وارد شوید.')
    expect(showInfo).not.toHaveBeenCalled()
    latest.login()
    expect(requestCode).toHaveBeenCalledTimes(1)
    expect(requestAccessToken).not.toHaveBeenCalled()
  })
})
