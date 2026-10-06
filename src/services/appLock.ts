import {
  clearBiometricConfig,
  enableBiometric,
  getBiometricStatus,
  isBiometricEnabled,
  registerAppLockBiometric,
  verifyBiometric
} from './appLockBiometric'
import { base64ToBuffer, bufferToBase64, hashPin, randomSalt } from './appLockCrypto'
import {
  APP_LOCK_CHANGED_EVENT,
  clearAccountConfig,
  clearDeviceConfig,
  getAccountConfig,
  getDeviceConfig,
  getSpreadsheetId,
  saveAccountConfig
} from './appLockStorage'
import { clearAppLockFromSheet, fetchAppLockFromSheet, saveAppLockToSheet } from './appLockSync'
import { getUserEmail } from './auth'
import type { AppLockAccountConfig, AppLockConfig } from '../types'

export const PIN_MIN_LENGTH = 4

export const PIN_MAX_LENGTH = 12

/** Configs saved before the length was tracked could only be unlocked with 4 digits. */
const LEGACY_PIN_LENGTH = 4

function isConfigEnabled(config: AppLockAccountConfig | null | undefined): boolean {
  return !!(config?.enabled && config.pinHash && config.pinSalt)
}

function parseTimestamp(iso: string | undefined): number {
  const time = iso ? Date.parse(iso) : 0

  return Number.isFinite(time) ? time : 0
}

export { APP_LOCK_CHANGED_EVENT }
export { isBiometricEnabled, enableBiometric, verifyBiometric, getBiometricStatus }
export type { BiometricStatus } from './appLockBiometric'

async function syncAccountToSheet(config: AppLockAccountConfig): Promise<void> {
  const spreadsheetId = getSpreadsheetId()

  if (!spreadsheetId) return
  if (config.enabled && config.pinHash && config.pinSalt) {
    await saveAppLockToSheet(spreadsheetId, config)
  } else {
    await clearAppLockFromSheet(spreadsheetId)
  }
}

export function isAppLockEnabled(): boolean {
  return isConfigEnabled(getAccountConfig())
}

export function getAppLockConfig(): AppLockConfig | null {
  const account = getAccountConfig()

  if (!account) return null

  const device = getDeviceConfig()

  return { ...account, ...device }
}

export function validatePinFormat(pin: string): string | null {
  if (pin.length < PIN_MIN_LENGTH) {
    return `رمز باید حداقل ${PIN_MIN_LENGTH} رقم باشد`
  }
  if (pin.length > PIN_MAX_LENGTH) {
    return `رمز حداکثر ${PIN_MAX_LENGTH} رقم می‌تواند باشد`
  }
  if (!/^\d+$/.test(pin)) {
    return 'رمز فقط باید عدد باشد'
  }

  return null
}

/** PIN length the unlock screen expects; `null` when it must accept any length. */
export function getStoredPinLength(): number | null {
  const config = getAccountConfig()

  if (!config || config.pinLength === null) return null

  return config.pinLength ?? LEGACY_PIN_LENGTH
}

/** A PIN that came through the sheet keeps the local length only if it is the same PIN. */
function adoptRemoteConfig(
  remote: AppLockAccountConfig,
  local: AppLockAccountConfig | null
): AppLockAccountConfig {
  const samePin = !!local && local.pinHash === remote.pinHash && local.pinSalt === remote.pinSalt

  return { ...remote, pinLength: samePin ? local.pinLength : null }
}

/**
 * Reconciles the local lock with the account's sheet. The local config is
 * already scoped to the signed-in account (see getAccountConfig), so it is
 * never pushed into another account's sheet. Enabling or changing the PIN
 * syncs as before; a remote disable only wins when it is newer than the local
 * config, so editing the sheet cannot silently switch the lock off.
 */
export async function syncAppLockFromSheet(): Promise<void> {
  const spreadsheetId = getSpreadsheetId()

  if (!spreadsheetId || !getUserEmail()) return

  const remote = await fetchAppLockFromSheet(spreadsheetId)

  const local = getAccountConfig()

  const localEnabled = isConfigEnabled(local)

  if (!remote) {
    if (local && localEnabled) await saveAppLockToSheet(spreadsheetId, local)

    return
  }

  const remoteTime = parseTimestamp(remote.updatedAt)

  const localTime = parseTimestamp(local?.updatedAt)

  if (!isConfigEnabled(remote)) {
    if (!local || !localEnabled) return

    if (remoteTime > localTime) {
      clearAccountConfig()
      window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT, { detail: { enabled: false } }))
    } else {
      await saveAppLockToSheet(spreadsheetId, local)
    }

    return
  }

  if (!local || remoteTime >= localTime) {
    saveAccountConfig(adoptRemoteConfig(remote, local))
  } else if (local.enabled) {
    await saveAppLockToSheet(spreadsheetId, local)
  }
}

export async function setupAppLock(pin: string, enableBiometricOnSetup = false): Promise<void> {
  const formatError = validatePinFormat(pin)

  if (formatError) throw new Error(formatError)

  const salt = randomSalt()

  const pinHash = await hashPin(pin, salt)

  const config: AppLockAccountConfig = {
    enabled: true,
    pinHash,
    pinSalt: bufferToBase64(salt.buffer as ArrayBuffer),
    updatedAt: new Date().toISOString(),
    pinLength: pin.length
  }

  saveAccountConfig(config)
  await syncAccountToSheet(config)

  if (enableBiometricOnSetup) {
    await registerAppLockBiometric()
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = getAccountConfig()

  if (!config?.pinHash || !config.pinSalt) return false

  const salt = new Uint8Array(base64ToBuffer(config.pinSalt))

  const hash = await hashPin(pin, salt)

  if (hash !== config.pinHash) return false

  // Learn the length of a PIN that arrived from another device so the unlock
  // screen can auto-submit next time.
  if (config.pinLength !== pin.length) {
    saveAccountConfig({ ...config, pinLength: pin.length })
  }

  return true
}

export async function disableAppLock(pin: string): Promise<void> {
  const valid = await verifyPin(pin)

  if (!valid) throw new Error('رمز اشتباه است')

  clearAccountConfig()
  clearDeviceConfig()
  await syncAccountToSheet({ enabled: false, pinHash: '', pinSalt: '' })

  window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT, { detail: { enabled: false } }))
}

export async function changePin(currentPin: string, newPin: string): Promise<void> {
  const valid = await verifyPin(currentPin)

  if (!valid) throw new Error('رمز فعلی اشتباه است')

  const formatError = validatePinFormat(newPin)

  if (formatError) throw new Error(formatError)

  const config = getAccountConfig()

  if (!config) throw new Error('قفل اپ فعال نیست')

  const salt = randomSalt()

  const pinHash = await hashPin(newPin, salt)

  const updated: AppLockAccountConfig = {
    ...config,
    pinHash,
    pinSalt: bufferToBase64(salt.buffer as ArrayBuffer),
    updatedAt: new Date().toISOString(),
    pinLength: newPin.length
  }

  saveAccountConfig(updated)
  await syncAccountToSheet(updated)
}

export async function disableBiometric(pin: string): Promise<void> {
  const valid = await verifyPin(pin)

  if (!valid) throw new Error('رمز اشتباه است')

  clearBiometricConfig()
}
