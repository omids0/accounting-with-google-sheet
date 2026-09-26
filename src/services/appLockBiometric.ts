import { base64ToBuffer, bufferToBase64 } from './appLockCrypto'
import { getAccountConfig, getDeviceConfig, saveDeviceConfig } from './appLockStorage'
import { getUserEmail, getUserName } from './auth'
import { isNativePlatform } from './googleAuthNative'

/** The APK has no WebAuthn, so there is no credential to store — only a marker. */
const NATIVE_CREDENTIAL_ID = 'native-biometric'

/** Imported on demand so the plugin never loads in the browser build or in tests. */
async function loadBiometricAuth() {
  return (await import('@aparajita/capacitor-biometric-auth')).BiometricAuth
}

async function authenticateNative(): Promise<void> {
  const BiometricAuth = await loadBiometricAuth()

  await BiometricAuth.authenticate({
    reason: 'برای باز کردن قفل اپ احراز هویت کنید',
    cancelTitle: 'انصراف',
    allowDeviceCredential: true
  })
}

async function registerBiometricCredential(): Promise<string> {
  const email = getUserEmail()

  if (!email) throw new Error('ابتدا وارد حساب شوید')

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const userId = crypto.getRandomValues(new Uint8Array(16))

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'حسابداری شخصی',
        id: window.location.hostname
      },
      user: {
        id: userId,
        name: email,
        displayName: getUserName() || email
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required'
      },
      timeout: 60_000,
      attestation: 'none'
    }
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('ثبت اثر انگشت لغو شد')

  return bufferToBase64(credential.rawId)
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const BiometricAuth = await loadBiometricAuth()

      return (await BiometricAuth.checkBiometry()).isAvailable
    } catch {
      return false
    }
  }

  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isBiometricEnabled(): boolean {
  const account = getAccountConfig()

  if (!account?.enabled || !account.pinHash || !account.pinSalt) return false

  const device = getDeviceConfig()

  return !!(device?.biometricEnabled && device.credentialId)
}

export async function registerAppLockBiometric(): Promise<void> {
  if (isNativePlatform()) {
    await authenticateNative()
    saveDeviceConfig({ biometricEnabled: true, credentialId: NATIVE_CREDENTIAL_ID })

    return
  }

  const credentialId = await registerBiometricCredential()

  saveDeviceConfig({ biometricEnabled: true, credentialId })
}

export async function enableBiometric(): Promise<void> {
  const account = getAccountConfig()

  if (!account?.enabled || !account.pinHash || !account.pinSalt) {
    throw new Error('ابتدا قفل اپ را فعال کنید')
  }

  await registerAppLockBiometric()
}

export function clearBiometricConfig(): void {
  saveDeviceConfig({ biometricEnabled: false, credentialId: undefined })
}

export async function verifyBiometric(): Promise<boolean> {
  const device = getDeviceConfig()

  if (!device?.credentialId) return false

  if (isNativePlatform()) {
    try {
      await authenticateNative()

      return true
    } catch {
      return false
    }
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64ToBuffer(device.credentialId),
            type: 'public-key'
          }
        ],
        userVerification: 'required',
        timeout: 60_000
      }
    })

    return !!credential
  } catch {
    return false
  }
}
