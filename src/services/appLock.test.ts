import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppLockAccountConfig } from '../types'

const fetchAppLockFromSheet = vi.fn<(id: string) => Promise<AppLockAccountConfig | null>>()

const saveAppLockToSheet = vi.fn(async () => undefined)

const clearAppLockFromSheet = vi.fn(async () => undefined)

vi.mock('./appLockSync', () => ({
  fetchAppLockFromSheet: (id: string) => fetchAppLockFromSheet(id),
  saveAppLockToSheet: (...args: unknown[]) => saveAppLockToSheet(...(args as [])),
  clearAppLockFromSheet: (...args: unknown[]) => clearAppLockFromSheet(...(args as []))
}))

vi.mock('./appLockBiometric', () => ({
  clearBiometricConfig: vi.fn(),
  enableBiometric: vi.fn(),
  getBiometricStatus: vi.fn(),
  isBiometricEnabled: () => false,
  registerAppLockBiometric: vi.fn(),
  verifyBiometric: vi.fn()
}))

vi.mock('./settings', () => ({ getSettings: () => ({ spreadsheetId: 'sheet-1' }) }))

const LOCK_KEY = 'accounting_app_lock'

const DEVICE_KEY = 'accounting_app_lock_device'

function signIn(email: string): void {
  localStorage.setItem(
    'accounting_session',
    JSON.stringify({ email, name: email, accessToken: 't', tokenExpiry: Date.now() + 3_600_000 })
  )
}

function storeLock(config: Partial<AppLockAccountConfig> & Record<string, unknown>): void {
  localStorage.setItem(
    LOCK_KEY,
    JSON.stringify({ enabled: true, pinHash: 'hash-a', pinSalt: 'salt-a', ...config })
  )
}

function storedLock(): AppLockAccountConfig | null {
  const raw = localStorage.getItem(LOCK_KEY)

  return raw ? (JSON.parse(raw) as AppLockAccountConfig) : null
}

describe('app lock account scoping and sync', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('lets an existing user keep a PIN saved before owners were tracked', async () => {
    const { getStoredPinLength, isAppLockEnabled } = await import('./appLock')

    signIn('owner@example.com')
    storeLock({ updatedAt: '2025-01-01T00:00:00.000Z' })

    expect(isAppLockEnabled()).toBe(true)
    expect(storedLock()?.ownerEmail).toBe('owner@example.com')
    expect(storedLock()?.updatedAt).toBe('2025-01-01T00:00:00.000Z')
    expect(getStoredPinLength()).toBe(4)
  })

  it('moves legacy biometric fields without dropping the rest of the config', async () => {
    const { isAppLockEnabled } = await import('./appLock')

    signIn('owner@example.com')
    storeLock({ updatedAt: '2025-01-01T00:00:00.000Z', biometricEnabled: true, credentialId: 'c' })

    expect(isAppLockEnabled()).toBe(true)
    expect(storedLock()).not.toHaveProperty('credentialId')
    expect(storedLock()?.updatedAt).toBe('2025-01-01T00:00:00.000Z')
    expect(JSON.parse(localStorage.getItem(DEVICE_KEY) ?? '{}')).toMatchObject({
      credentialId: 'c'
    })
  })

  it("never pushes another account's PIN into the signed-in account's sheet", async () => {
    const { isAppLockEnabled, syncAppLockFromSheet } = await import('./appLock')

    signIn('b@example.com')
    storeLock({ ownerEmail: 'a@example.com' })
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ biometricEnabled: true }))
    fetchAppLockFromSheet.mockResolvedValue(null)

    await syncAppLockFromSheet()

    expect(saveAppLockToSheet).not.toHaveBeenCalled()
    expect(isAppLockEnabled()).toBe(false)
    expect(localStorage.getItem(LOCK_KEY)).toBeNull()
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull()
  })

  it('pushes its own PIN when the sheet has no lock row yet', async () => {
    const { syncAppLockFromSheet } = await import('./appLock')

    signIn('a@example.com')
    storeLock({ ownerEmail: 'a@example.com' })
    fetchAppLockFromSheet.mockResolvedValue(null)

    await syncAppLockFromSheet()

    expect(saveAppLockToSheet).toHaveBeenCalledTimes(1)
  })

  it('ignores a remote disable that is older than the local PIN', async () => {
    const { isAppLockEnabled, syncAppLockFromSheet } = await import('./appLock')

    signIn('a@example.com')
    storeLock({ ownerEmail: 'a@example.com', updatedAt: '2026-05-01T00:00:00.000Z' })
    fetchAppLockFromSheet.mockResolvedValue({
      enabled: false,
      pinHash: '',
      pinSalt: '',
      updatedAt: '2026-04-01T00:00:00.000Z'
    })

    await syncAppLockFromSheet()

    expect(isAppLockEnabled()).toBe(true)
    expect(saveAppLockToSheet).toHaveBeenCalledTimes(1)
  })

  it('honours a remote disable that is newer than the local PIN', async () => {
    const { isAppLockEnabled, syncAppLockFromSheet } = await import('./appLock')

    signIn('a@example.com')
    storeLock({ ownerEmail: 'a@example.com', updatedAt: '2026-05-01T00:00:00.000Z' })
    fetchAppLockFromSheet.mockResolvedValue({
      enabled: false,
      pinHash: '',
      pinSalt: '',
      updatedAt: '2026-06-01T00:00:00.000Z'
    })

    await syncAppLockFromSheet()

    expect(isAppLockEnabled()).toBe(false)
    expect(saveAppLockToSheet).not.toHaveBeenCalled()
  })

  it('adopts a newer PIN from another device with an unknown length', async () => {
    const { getStoredPinLength, syncAppLockFromSheet } = await import('./appLock')

    signIn('a@example.com')
    storeLock({ ownerEmail: 'a@example.com', updatedAt: '2026-05-01T00:00:00.000Z', pinLength: 4 })
    fetchAppLockFromSheet.mockResolvedValue({
      enabled: true,
      pinHash: 'hash-b',
      pinSalt: 'salt-b',
      updatedAt: '2026-06-01T00:00:00.000Z'
    })

    await syncAppLockFromSheet()

    expect(storedLock()?.pinHash).toBe('hash-b')
    expect(storedLock()?.ownerEmail).toBe('a@example.com')
    expect(getStoredPinLength()).toBeNull()
  })

  it('keeps the known length when the sheet holds the same PIN', async () => {
    const { getStoredPinLength, syncAppLockFromSheet } = await import('./appLock')

    signIn('a@example.com')
    storeLock({ ownerEmail: 'a@example.com', updatedAt: '2026-05-01T00:00:00.000Z', pinLength: 6 })
    fetchAppLockFromSheet.mockResolvedValue({
      enabled: true,
      pinHash: 'hash-a',
      pinSalt: 'salt-a',
      updatedAt: '2026-05-01T00:00:01.000Z'
    })

    await syncAppLockFromSheet()

    expect(getStoredPinLength()).toBe(6)
  })

  it('stores the PIN length on setup and learns it on unlock', async () => {
    const { getStoredPinLength, setupAppLock, verifyPin } = await import('./appLock')

    signIn('a@example.com')
    await setupAppLock('123456')

    expect(getStoredPinLength()).toBe(6)

    storeLock({ ...storedLock(), pinLength: null })

    expect(await verifyPin('123456')).toBe(true)
    expect(getStoredPinLength()).toBe(6)
    expect(await verifyPin('000000')).toBe(false)
  })
})
