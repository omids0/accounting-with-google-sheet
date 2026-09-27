import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticate = vi.fn(async () => undefined)

const checkBiometry = vi.fn()

vi.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: { authenticate, checkBiometry },
  BiometryType: { 0: 'none', 3: 'fingerprint' },
  AndroidBiometryStrength: { weak: 0, strong: 1 }
}))

vi.mock('./googleAuthNative', () => ({ isNativePlatform: () => true }))

const saveDeviceConfig = vi.fn()

vi.mock('./appLockStorage', () => ({
  getAccountConfig: () => ({ enabled: true, pinHash: 'h', pinSalt: 's' }),
  getDeviceConfig: () => ({ biometricEnabled: true, credentialId: 'native-biometric' }),
  saveDeviceConfig: (...args: unknown[]) => saveDeviceConfig(...args)
}))

vi.mock('./auth', () => ({ getUserEmail: () => 'a@b.c', getUserName: () => 'A' }))

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

    await registerAppLockBiometric()

    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ allowDeviceCredential: false, androidBiometryStrength: 0 })
    )
  })

  it('falls back to the screen lock when nothing is enrolled', async () => {
    checkBiometry.mockResolvedValue(biometry({ deviceIsSecure: true, code: 'biometryNotEnrolled' }))

    const { registerAppLockBiometric } = await import('./appLockBiometric')

    await registerAppLockBiometric()

    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ allowDeviceCredential: true, androidBiometryStrength: 1 })
    )
  })

  it('never pairs weak biometry with the device credential', async () => {
    for (const enrolled of [true, false]) {
      checkBiometry.mockResolvedValue(biometry({ isAvailable: enrolled, deviceIsSecure: true }))

      const { registerAppLockBiometric } = await import('./appLockBiometric')

      await registerAppLockBiometric()
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
