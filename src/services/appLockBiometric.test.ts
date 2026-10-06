import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticate = vi.fn(async () => undefined)

const checkBiometry = vi.fn()

vi.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: { authenticate, checkBiometry },
  BiometryType: { 0: 'none', 3: 'fingerprint' },
  AndroidBiometryStrength: { weak: 0, strong: 1 }
}))

vi.mock('./googleAuthNative', () => ({ isNativePlatform: () => true }))

const updateDeviceConfig = vi.fn()

vi.mock('./appLockStorage', () => ({
  getAccountConfig: () => ({ enabled: true, pinHash: 'h', pinSalt: 's' }),
  getDeviceConfig: () => ({ biometricEnabled: true, credentialId: 'native-biometric' }),
  isLockConfigEnabled: () => true,
  updateDeviceConfig: (...args: unknown[]) => updateDeviceConfig(...args)
}))

const storeDeviceBoundDataKey = vi.fn(async (_key: CryptoKey) => undefined)

vi.mock('./appLockBiometricKey', () => ({
  deleteBiometricDataKey: vi.fn(async () => undefined),
  getPrfSalt: vi.fn(),
  loadBiometricKeyRecord: vi.fn(async () => null),
  newPrfSalt: () => new Uint8Array(32),
  openBiometricDataKey: vi.fn(),
  storeDeviceBoundDataKey: (key: CryptoKey) => storeDeviceBoundDataKey(key),
  storePrfWrappedDataKey: vi.fn()
}))

vi.mock('./auth', () => ({ getUserEmail: () => 'a@b.c', getUserName: () => 'A' }))

const FAKE_KEY = { extractable: true } as CryptoKey

function biometry(overrides: Record<string, unknown>) {
  return {
    isAvailable: false,
    strongBiometryIsAvailable: false,
    biometryType: 3,
    biometryTypes: [3],
    deviceIsSecure: false,
    reason: '',
    code: '',
    ...overrides
  }
}

describe('native biometric prompt options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks for biometry alone once a finger is enrolled', async () => {
    checkBiometry.mockResolvedValue(biometry({ isAvailable: true, deviceIsSecure: true }))

    const { registerAppLockBiometric } = await import('./appLockBiometric')

    await registerAppLockBiometric(FAKE_KEY)

    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ allowDeviceCredential: false, androidBiometryStrength: 0 })
    )
    // The APK has no secure key store in the plugin: a non-extractable copy is kept.
    expect(storeDeviceBoundDataKey).toHaveBeenCalledWith(FAKE_KEY)
    expect(updateDeviceConfig).toHaveBeenCalledWith({
      biometricEnabled: true,
      credentialId: 'native-biometric'
    })
  })

  it('falls back to the screen lock when nothing is enrolled', async () => {
    checkBiometry.mockResolvedValue(biometry({ deviceIsSecure: true, code: 'biometryNotEnrolled' }))

    const { registerAppLockBiometric } = await import('./appLockBiometric')

    await registerAppLockBiometric(FAKE_KEY)

    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ allowDeviceCredential: true, androidBiometryStrength: 1 })
    )
  })

  it('never pairs weak biometry with the device credential', async () => {
    for (const enrolled of [true, false]) {
      checkBiometry.mockResolvedValue(biometry({ isAvailable: enrolled, deviceIsSecure: true }))

      const { registerAppLockBiometric } = await import('./appLockBiometric')

      await registerAppLockBiometric(FAKE_KEY)
    }

    for (const [options] of authenticate.mock.calls as unknown as [
      { allowDeviceCredential: boolean; androidBiometryStrength: number }
    ][]) {
      expect(options.allowDeviceCredential && options.androidBiometryStrength === 0).toBe(false)
    }
  })

  it('reports an unsecured device instead of offering the prompt', async () => {
    checkBiometry.mockResolvedValue(biometry({ code: 'biometryNotAvailable' }))

    const { getBiometricStatus } = await import('./appLockBiometric')

    const status = await getBiometricStatus()

    expect(status.available).toBe(false)
    expect(status.detail).toContain('secure=false')
  })
})
