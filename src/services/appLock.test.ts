import { beforeEach, describe, expect, it, vi } from 'vitest'

import { bufferToBase64, hashPin } from './appLockCrypto'
import type * as VaultModule from './appLockVault'
import type { AppLockAccountConfig } from '../types'

const reencodeAllSnapshots = vi.fn(async (..._args: unknown[]) => undefined)

const sealPlaintextSnapshots = vi.fn(async (..._args: unknown[]) => undefined)

const deleteBiometricKeyDatabase = vi.fn(async () => undefined)

vi.mock('./spreadsheetStoreEncryption', () => ({
  reencodeAllSnapshots: (...args: unknown[]) => reencodeAllSnapshots(...args),
  sealPlaintextSnapshots: (...args: unknown[]) => sealPlaintextSnapshots(...args)
}))

vi.mock('./appLockBiometric', () => ({
  canUnlockWithBiometric: vi.fn(async () => false),
  clearBiometricConfig: vi.fn(),
  ensureBiometricKeyCopy: vi.fn(async () => undefined),
  getBiometricStatus: vi.fn(),
  isBiometricEnabled: () => false,
  registerAppLockBiometric: vi.fn(),
  unlockBiometricDataKey: vi.fn(async () => null)
}))

vi.mock('./appLockBiometricKey', () => ({
  deleteBiometricKeyDatabase: () => deleteBiometricKeyDatabase(),
  storeDeviceBoundDataKey: vi.fn(async () => undefined)
}))

// Real vaults use 600k PBKDF2 rounds; the tests wrap with fewer to stay fast.
vi.mock('./appLockVault', async importOriginal => {
  const actual = await importOriginal<typeof VaultModule>()

  return {
    ...actual,
    wrapDataKey: (key: CryptoKey, pin: string) => actual.wrapDataKey(key, pin, 1_000)
  }
})

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

/** A lock exactly as an older version saved it: a PBKDF2 hash of a 4-digit PIN. */
async function storeLegacyLock(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))

  storeLock({
    pinHash: await hashPin(pin, salt),
    pinSalt: bufferToBase64(salt.buffer as ArrayBuffer),
    ownerEmail: 'owner@example.com'
  })
}

function storedLock(): AppLockAccountConfig | null {
  const raw = localStorage.getItem(LOCK_KEY)

  return raw ? (JSON.parse(raw) as AppLockAccountConfig) : null
}

async function rawKey(key: CryptoKey | null): Promise<string> {
  if (!key) return ''

  return Buffer.from(await crypto.subtle.exportKey('raw', key)).toString('hex')
}

describe('app lock account scoping', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
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
    expect(JSON.parse(localStorage.getItem(DEVICE_KEY) ?? '{}')).toMatchObject({
      credentialId: 'c'
    })
  })

  it("drops another account's lock", async () => {
    const { isAppLockEnabled } = await import('./appLock')

    signIn('b@example.com')
    storeLock({ ownerEmail: 'a@example.com' })

    expect(isAppLockEnabled()).toBe(false)
    expect(localStorage.getItem(LOCK_KEY)).toBeNull()
  })
})

describe('PIN rules', () => {
  it('needs 6 to 12 digits for a new PIN', async () => {
    const { validatePinFormat } = await import('./appLock')

    expect(validatePinFormat('12345')).not.toBeNull()
    expect(validatePinFormat('123456')).toBeNull()
    expect(validatePinFormat('123456789012')).toBeNull()
    expect(validatePinFormat('1234567890123')).not.toBeNull()
    expect(validatePinFormat('12345a')).not.toBeNull()
  })

  it('still unlocks with an old 4-digit PIN', async () => {
    const { isAcceptableUnlockPin } = await import('./appLockPin')

    expect(isAcceptableUnlockPin('1234')).toBe(true)
    expect(isAcceptableUnlockPin('123')).toBe(false)
    expect(isAcceptableUnlockPin('1234567890123')).toBe(false)
  })
})

describe('app lock encryption keys', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    signIn('owner@example.com')
    ;(await import('./appLockDataKey')).clearDataKey()
  })

  it('refuses a PIN shorter than 6 digits on setup', async () => {
    const { setupAppLock } = await import('./appLock')

    await expect(setupAppLock('1234')).rejects.toThrow()
    expect(storedLock()).toBeNull()
  })

  it('creates a vault, keeps no PIN hash and encrypts the existing data', async () => {
    const { isAppLockEnabled, setupAppLock } = await import('./appLock')
    const { getDataKey } = await import('./appLockDataKey')

    await setupAppLock('123456')

    const config = storedLock()

    expect(isAppLockEnabled()).toBe(true)
    expect(config?.vault?.v).toBe(1)
    expect(config).not.toHaveProperty('pinHash')
    expect(config?.pinLength).toBe(6)
    expect(getDataKey()).not.toBeNull()
    expect(reencodeAllSnapshots).toHaveBeenCalledWith(null, getDataKey())
  })

  it('unlocks with the right PIN only', async () => {
    const { setupAppLock, unlockWithPin } = await import('./appLock')
    const { clearDataKey, getDataKey } = await import('./appLockDataKey')

    await setupAppLock('123456')

    const original = await rawKey(getDataKey())

    clearDataKey()

    expect(await unlockWithPin('654321')).toBe(false)
    expect(getDataKey()).toBeNull()
    expect(await unlockWithPin('123456')).toBe(true)
    expect(await rawKey(getDataKey())).toBe(original)
  })

  it('migrates a 4-digit lock from before encryption on the first PIN unlock', async () => {
    const { getStoredPinLength, unlockWithPin } = await import('./appLock')
    const { getDataKey } = await import('./appLockDataKey')
    const { isPinUpgradePending } = await import('./appLockPrompts')

    await storeLegacyLock('1234')

    expect(await unlockWithPin('9999')).toBe(false)
    expect(storedLock()?.vault).toBeUndefined()

    expect(await unlockWithPin('1234')).toBe(true)
    expect(storedLock()?.vault).toBeDefined()
    expect(storedLock()).not.toHaveProperty('pinHash')
    expect(getStoredPinLength()).toBe(4)
    expect(reencodeAllSnapshots).toHaveBeenCalledWith(null, getDataKey())
    expect(isPinUpgradePending()).toBe(true)
  })

  it('re-wraps the same data key when the PIN changes', async () => {
    const { changePin, setupAppLock, unlockWithPin } = await import('./appLock')
    const { clearDataKey, getDataKey } = await import('./appLockDataKey')

    await setupAppLock('123456')

    const original = await rawKey(getDataKey())

    const oldVault = storedLock()?.vault

    reencodeAllSnapshots.mockClear()

    await expect(changePin('000000', '7654321')).rejects.toThrow()
    await changePin('123456', '7654321')

    expect(storedLock()?.vault?.salt).not.toBe(oldVault?.salt)
    expect(storedLock()?.pinLength).toBe(7)
    expect(reencodeAllSnapshots).not.toHaveBeenCalled()

    clearDataKey()

    expect(await unlockWithPin('123456')).toBe(false)
    expect(await unlockWithPin('7654321')).toBe(true)
    expect(await rawKey(getDataKey())).toBe(original)
  })

  it('decrypts the data and deletes all key material when the lock is turned off', async () => {
    const { disableAppLock, isAppLockEnabled, setupAppLock } = await import('./appLock')
    const { getDataKey } = await import('./appLockDataKey')

    await setupAppLock('123456')

    const key = getDataKey()

    await expect(disableAppLock('111111')).rejects.toThrow()
    expect(isAppLockEnabled()).toBe(true)

    await disableAppLock('123456')

    expect(isAppLockEnabled()).toBe(false)
    expect(storedLock()).toBeNull()
    expect(getDataKey()).toBeNull()
    expect(reencodeAllSnapshots).toHaveBeenLastCalledWith(key, null)
    expect(deleteBiometricKeyDatabase).toHaveBeenCalled()
  })
})
