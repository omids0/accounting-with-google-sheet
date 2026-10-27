import { describe, expect, it, vi } from 'vitest'

describe('inviteLandingUrl', () => {
  it('puts the code in the hash next to this build of the app', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_APP_URL', 'https://example.github.io/app/dev/')

    const { inviteLandingUrl, inviteMessage } = await import('./inviteShare')

    expect(inviteLandingUrl('AbC123_-xY')).toBe(
      'https://example.github.io/app/dev/invite.html#ref=AbC123_-xY'
    )
    expect(inviteLandingUrl()).toBe('https://example.github.io/app/dev/invite.html')
    expect(inviteMessage('https://x.test/i')).toMatch(/\nhttps:\/\/x\.test\/i$/)
    vi.unstubAllEnvs()
  })

  it('has no link when the build has no app address', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_APP_URL', '')

    const { inviteLandingUrl } = await import('./inviteShare')

    expect(inviteLandingUrl('AbC123_-xY')).toBe('')
    vi.unstubAllEnvs()
  })
})
