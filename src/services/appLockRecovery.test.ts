import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AuthModule from './auth'

const clearAllLocalData = vi.fn(async (_options?: { revokeAccess?: boolean }) => {
  localStorage.removeItem('accounting_session')
  localStorage.removeItem('accounting_app_lock')
})

const fetchUserProfile = vi.fn()

const signOutNative = vi.fn(async () => undefined)

const native = { value: false }

vi.mock('./localDataWipe', () => ({
  clearAllLocalData: (options?: { revokeAccess?: boolean }) => clearAllLocalData(options)
}))

vi.mock('./googleAuthNative', () => ({
  isNativePlatform: () => native.value,
  signOutNative: () => signOutNative()
}))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<typeof AuthModule>()),
  fetchUserProfile: (token: string) => fetchUserProfile(token)
}))

function seed(): void {
  localStorage.setItem(
    'accounting_session',
    JSON.stringify({ email: 'Owner@Example.com', name: 'O', accessToken: 'old', tokenExpiry: 1 })
  )
  localStorage.setItem('accounting_app_lock', JSON.stringify({ enabled: true, vault: {} }))
}

describe('forgotten PIN recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    native.value = false
    seed()
  })

  it('wipes nothing when another Google account signs in', async () => {
    const { recoverPinWithGoogleToken } = await import('./appLockRecovery')

    fetchUserProfile.mockResolvedValue({ email: 'thief@example.com', name: 'T' })
    native.value = true

    expect(await recoverPinWithGoogleToken('new-token')).toBe('mismatch')
    expect(clearAllLocalData).not.toHaveBeenCalled()
    expect(localStorage.getItem('accounting_app_lock')).not.toBeNull()
    expect(JSON.parse(localStorage.getItem('accounting_session')!).accessToken).toBe('old')
    expect(signOutNative).toHaveBeenCalled()
  })

  it('wipes the device copy and keeps the fresh token for the same account', async () => {
    const { recoverPinWithGoogleToken } = await import('./appLockRecovery')
    const { isLockSetupOffered } = await import('./appLockPrompts')

    fetchUserProfile.mockResolvedValue({ email: 'owner@example.com', name: 'Owner' })

    expect(await recoverPinWithGoogleToken('new-token', 3600)).toBe('recovered')
    expect(fetchUserProfile).toHaveBeenCalledWith('new-token')
    expect(clearAllLocalData).toHaveBeenCalledWith({ revokeAccess: false })
    expect(localStorage.getItem('accounting_app_lock')).toBeNull()
    expect(JSON.parse(localStorage.getItem('accounting_session')!)).toMatchObject({
      email: 'owner@example.com',
      accessToken: 'new-token'
    })
    expect(isLockSetupOffered()).toBe(true)
  })
})
