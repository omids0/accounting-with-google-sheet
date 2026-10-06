import {
  deleteBiometricDataKey,
  getPrfSalt,
  loadBiometricKeyRecord,
  newPrfSalt,
  openBiometricDataKey,
  storeDeviceBoundDataKey,
  storePrfWrappedDataKey
} from './appLockBiometricKey'
import {
  getAccountConfig,
  getDeviceConfig,
  isLockConfigEnabled,
  updateDeviceConfig
} from './appLockStorage'
import { getWebAuthnAssertion, registerWebAuthnCredential } from './appLockWebAuthn'
import { isNativePlatform } from './googleAuthNative'

/** The APK has no WebAuthn, so there is no credential to store — only a marker. */
const NATIVE_CREDENTIAL_ID = 'native-biometric'

/** The prompt lives in its own activity, so a lost result would hang the screen. */
const AUTH_TIMEOUT_MS = 90_000

/** Imported on demand so the plugin never loads in the browser build or in tests. */
async function loadBiometricAuth() {
  return await import('@aparajita/capacitor-biometric-auth')
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('پاسخی از احراز هویت دستگاه دریافت نشد')),
      ms
    )

    promise.then(resolve, reject).finally(() => window.clearTimeout(timer))
  })
}

/**
 * androidx.biometric rejects BIOMETRIC_WEAK | DEVICE_CREDENTIAL outright, and the
 * plugin ORs DEVICE_CREDENTIAL onto whatever strength it is given — so asking for
 * both at once builds an unsupported prompt. Ask for exactly one of them.
 */
async function authenticateNative(enrolled: boolean): Promise<void> {
  const { AndroidBiometryStrength, BiometricAuth } = await loadBiometricAuth()

  const reason = 'برای باز کردن قفل اپ احراز هویت کنید'

  const options = enrolled
    ? {
        reason,
        cancelTitle: 'انصراف',
        allowDeviceCredential: false,
        androidBiometryStrength: AndroidBiometryStrength.weak
      }
    : {
        reason,
        allowDeviceCredential: true,
        androidBiometryStrength: AndroidBiometryStrength.strong
      }

  await withTimeout(BiometricAuth.authenticate(options), AUTH_TIMEOUT_MS)
}

export interface BiometricStatus {
  available: boolean
  /** True once the user has enrolled a finger or face; false means screen-lock only. */
  enrolled: boolean
  /** Persian sentence shown when `available` is false. */
  reason: string | null
  /** Raw platform answer, shown in small print so a screenshot is diagnosable. */
  detail: string | null
}

async function getNativeStatus(): Promise<BiometricStatus> {
  const { BiometricAuth, BiometryType } = await loadBiometricAuth()

  const result = await BiometricAuth.checkBiometry()

  const detail = [
    `type=${BiometryType[result.biometryType] ?? result.biometryType}`,
    `enrolled=${result.isAvailable}`,
    `strong=${result.strongBiometryIsAvailable}`,
    `secure=${result.deviceIsSecure}`,
    `code=${result.code || '-'}`
  ].join(' · ')

  // A secured device can unlock with its PIN, pattern or password even when no
  // finger is enrolled, so screen-lock alone is enough to offer the option.
  if (result.isAvailable || result.deviceIsSecure) {
    return { available: true, enrolled: result.isAvailable, reason: null, detail }
  }

  return {
    available: false,
    enrolled: false,
    reason: 'برای استفاده از اثر انگشت، ابتدا قفل صفحه (رمز، الگو یا PIN) گوشی را فعال کنید.',
    detail
  }
}

async function getWebStatus(): Promise<BiometricStatus> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      available: false,
      enrolled: false,
      reason: 'مرورگر این دستگاه از ورود با اثر انگشت پشتیبانی نمی‌کند.',
      detail: 'webauthn=unsupported'
    }
  }

  const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

  return {
    available,
    enrolled: available,
    reason: available ? null : 'روی این دستگاه حسگر اثر انگشتِ قابل استفاده پیدا نشد.',
    detail: `webauthn=${available}`
  }
}

/**
 * One call for both the toggle and its explanation, so the screen never hides the
 * option without saying why.
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    return isNativePlatform() ? await getNativeStatus() : await getWebStatus()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'خطای نامشخص'

    return {
      available: false,
      enrolled: false,
      reason: `بررسی اثر انگشت ناموفق بود (${message}).`,
      detail: `error=${message}`
    }
  }
}

export function isBiometricEnabled(): boolean {
  if (!isLockConfigEnabled(getAccountConfig())) return false

  const device = getDeviceConfig()

  return !!(device?.biometricEnabled && device.credentialId)
}

/**
 * Biometric unlock also has to hand over the data key, so it needs a stored
 * key copy. A lock from before encryption has none until one PIN unlock.
 */
export async function canUnlockWithBiometric(): Promise<boolean> {
  if (!isBiometricEnabled() || !getAccountConfig()?.vault) return false

  return !!(await loadBiometricKeyRecord())
}

/**
 * After a PIN unlock: gives an enabled fingerprint the key copy it lacks (a lock
 * from before encryption, or cleared site data). No prompt is shown, so the
 * copy is device-bound even where WebAuthn PRF would be available.
 */
export async function ensureBiometricKeyCopy(dataKey: CryptoKey): Promise<void> {
  if (!isBiometricEnabled() || (await loadBiometricKeyRecord())) return

  await storeDeviceBoundDataKey(dataKey).catch(() => undefined)
}

/** Web: PRF-wrapped when the authenticator supports it, else a device-bound key. */
async function registerWebBiometric(dataKey: CryptoKey): Promise<string> {
  const prfSalt = newPrfSalt()

  const created = await registerWebAuthnCredential(prfSalt)

  let prfOutput = created.prfOutput

  // Most authenticators only return PRF output on an assertion, not on creation.
  if (!prfOutput && created.prfEnabled) {
    prfOutput = (await getWebAuthnAssertion(created.credentialId, prfSalt))?.prfOutput ?? null
  }

  if (prfOutput) {
    await storePrfWrappedDataKey(dataKey, prfOutput, prfSalt)
  } else {
    await storeDeviceBoundDataKey(dataKey)
  }

  return created.credentialId
}

/** Registers the fingerprint and stores a copy of the (extractable) data key for it. */
export async function registerAppLockBiometric(dataKey: CryptoKey): Promise<void> {
  if (isNativePlatform()) {
    await authenticateNative((await getBiometricStatus()).enrolled)
    await storeDeviceBoundDataKey(dataKey)
    updateDeviceConfig({ biometricEnabled: true, credentialId: NATIVE_CREDENTIAL_ID })

    return
  }

  const credentialId = await registerWebBiometric(dataKey)

  updateDeviceConfig({ biometricEnabled: true, credentialId })
}

export function clearBiometricConfig(): void {
  updateDeviceConfig({ biometricEnabled: false, credentialId: undefined })
  void deleteBiometricDataKey()
}

/** Runs the fingerprint check and returns the data key, or null when refused. */
export async function unlockBiometricDataKey(): Promise<CryptoKey | null> {
  const device = getDeviceConfig()

  const record = device?.credentialId ? await loadBiometricKeyRecord() : null

  if (!device?.credentialId || !record) return null

  if (isNativePlatform()) {
    try {
      await authenticateNative((await getBiometricStatus()).enrolled)
    } catch {
      return null
    }

    return await openBiometricDataKey(record, null)
  }

  const assertion = await getWebAuthnAssertion(device.credentialId, getPrfSalt(record))

  return assertion ? await openBiometricDataKey(record, assertion.prfOutput) : null
}
