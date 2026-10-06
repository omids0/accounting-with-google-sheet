import {
  canUnlockWithBiometric,
  clearBiometricConfig,
  ensureBiometricKeyCopy,
  getBiometricStatus,
  isBiometricEnabled,
  registerAppLockBiometric,
  unlockBiometricDataKey
} from './appLockBiometric'
import { deleteBiometricKeyDatabase } from './appLockBiometricKey'
import { base64ToBuffer, hashPin } from './appLockCrypto'
import { clearDataKey, getDataKey, setDataKey } from './appLockDataKey'
import { isAcceptableUnlockPin, validatePinFormat } from './appLockPin'
import { dismissPinUpgrade, notePinUnlock } from './appLockPrompts'
import {
  APP_LOCK_CHANGED_EVENT,
  clearAccountConfig,
  clearDeviceConfig,
  getAccountConfig,
  getDeviceConfig,
  isLockConfigEnabled,
  saveAccountConfig
} from './appLockStorage'
import { generateDataKey, unwrapDataKey, wrapDataKey } from './appLockVault'
import { reencodeAllSnapshots, sealPlaintextSnapshots } from './spreadsheetStoreEncryption'
import type { AppLockAccountConfig, AppLockConfig, AppLockVaultConfig } from '../types'

export {
  LEGACY_PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  validatePinFormat
} from './appLockPin'
export { APP_LOCK_CHANGED_EVENT }
export { canUnlockWithBiometric, getBiometricStatus, isBiometricEnabled }
export type { BiometricStatus } from './appLockBiometric'

/** Configs saved before the length was tracked could only be unlocked with 4 digits. */
const LEGACY_PIN_LENGTH = 4

export function isAppLockEnabled(): boolean {
  return isLockConfigEnabled(getAccountConfig())
}

export function getAppLockConfig(): AppLockConfig | null {
  const account = getAccountConfig()

  if (!account) return null

  return { ...account, ...getDeviceConfig() }
}

/** PIN length the unlock screen expects; `null` when it must accept any length. */
export function getStoredPinLength(): number | null {
  const config = getAccountConfig()

  if (!config || config.pinLength === null) return null

  return config.pinLength ?? LEGACY_PIN_LENGTH
}

/** From here on the vault is the only PIN secret on the device: the legacy hash goes. */
function saveVaultConfig(
  base: AppLockAccountConfig,
  vault: AppLockVaultConfig,
  pinLength: number
): void {
  const { pinHash: _hash, pinSalt: _salt, ...rest } = base

  saveAccountConfig({
    ...rest,
    enabled: true,
    vault,
    pinLength,
    updatedAt: new Date().toISOString()
  })
}

async function legacyPinMatches(config: AppLockAccountConfig, pin: string): Promise<boolean> {
  if (!config.pinHash || !config.pinSalt) return false

  const hash = await hashPin(pin, new Uint8Array(base64ToBuffer(config.pinSalt)))

  return hash === config.pinHash
}

/**
 * A lock set up before encryption existed: the right PIN creates the data key,
 * wraps it, drops the legacy hash and encrypts what is already on the device.
 */
async function migrateLegacyLock(config: AppLockAccountConfig, pin: string): Promise<CryptoKey> {
  const dataKey = await generateDataKey()

  saveVaultConfig(config, await wrapDataKey(dataKey, pin), pin.length)
  setDataKey(dataKey)
  await reencodeAllSnapshots(null, dataKey)

  return dataKey
}

/** The data key for this PIN, or null when the PIN is wrong. */
async function openDataKeyWithPin(pin: string): Promise<CryptoKey | null> {
  const config = getAccountConfig()

  if (!config || !isLockConfigEnabled(config) || !isAcceptableUnlockPin(pin)) return null

  if (config.vault) return await unwrapDataKey(config.vault, pin)

  if (!(await legacyPinMatches(config, pin))) return null

  return await migrateLegacyLock(config, pin)
}

/** Unlock screen: a right PIN puts the data key in memory. */
export async function unlockWithPin(pin: string): Promise<boolean> {
  const dataKey = await openDataKeyWithPin(pin)

  if (!dataKey) return false

  const config = getAccountConfig()

  // Learn the length of a PIN that arrived from another device so the unlock
  // screen can auto-submit next time.
  if (config && config.pinLength !== pin.length) {
    saveAccountConfig({ ...config, pinLength: pin.length })
  }

  setDataKey(dataKey)
  await sealPlaintextSnapshots(dataKey)
  await ensureBiometricKeyCopy(dataKey)
  notePinUnlock(pin.length)

  return true
}

export async function unlockWithBiometric(): Promise<boolean> {
  const dataKey = await unlockBiometricDataKey()

  if (!dataKey) return false

  setDataKey(dataKey)

  return true
}

/** Turns the lock on and encrypts this device's copy of the data with a new key. */
export async function setupAppLock(pin: string, enableBiometricOnSetup = false): Promise<void> {
  const formatError = validatePinFormat(pin)

  if (formatError) throw new Error(formatError)

  const dataKey = await generateDataKey()

  const vault = await wrapDataKey(dataKey, pin)

  setDataKey(dataKey)
  saveAccountConfig({
    enabled: true,
    vault,
    updatedAt: new Date().toISOString(),
    pinLength: pin.length
  })
  await reencodeAllSnapshots(null, dataKey)

  if (enableBiometricOnSetup) await registerAppLockBiometric(dataKey)
}

/** Re-wraps the same data key with the new PIN; the data is not re-encrypted. */
export async function changePin(currentPin: string, newPin: string): Promise<void> {
  const formatError = validatePinFormat(newPin)

  if (formatError) throw new Error(formatError)

  const dataKey = await openDataKeyWithPin(currentPin)

  if (!dataKey) throw new Error('رمز فعلی اشتباه است')

  const config = getAccountConfig()

  if (!config) throw new Error('قفل اپ فعال نیست')

  saveVaultConfig(config, await wrapDataKey(dataKey, newPin), newPin.length)
  setDataKey(dataKey)
  dismissPinUpgrade()
}

/** Decrypts this device's data back to plaintext and deletes all key material. */
export async function disableAppLock(pin: string): Promise<void> {
  const dataKey = await openDataKeyWithPin(pin)

  if (!dataKey) throw new Error('رمز اشتباه است')

  // Config first: from here on every write is plaintext, so none is lost.
  clearAccountConfig()
  clearDeviceConfig()
  clearDataKey()
  await reencodeAllSnapshots(dataKey, null)
  await deleteBiometricKeyDatabase()

  window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT, { detail: { enabled: false } }))
}

export async function enableBiometric(): Promise<void> {
  if (!isAppLockEnabled()) throw new Error('ابتدا قفل اپ را فعال کنید')

  const dataKey = getDataKey()

  if (!dataKey?.extractable || !getAccountConfig()?.vault) {
    throw new Error('یک بار قفل را با رمز باز کنید و دوباره تلاش کنید')
  }

  await registerAppLockBiometric(dataKey)
}

export async function disableBiometric(pin: string): Promise<void> {
  const dataKey = await openDataKeyWithPin(pin)

  if (!dataKey) throw new Error('رمز اشتباه است')

  // A key opened by the PIN can be copied again if biometric is re-enabled later.
  setDataKey(dataKey)
  clearBiometricConfig()
}
