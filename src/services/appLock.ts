import {
  clearBiometricConfig,
  enableBiometric,
  isBiometricAvailable,
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
import type { AppLockAccountConfig, AppLockConfig } from '../types'
import { isLocalhost } from '../utils/localDev'

const PIN_MIN_LENGTH = 4

export { APP_LOCK_CHANGED_EVENT }
export { isBiometricAvailable, isBiometricEnabled, enableBiometric, verifyBiometric }

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
  if (isLocalhost()) return false

  const config = getAccountConfig()

  return !!(config?.enabled && config.pinHash && config.pinSalt)
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
  if (!/^\d+$/.test(pin)) {
    return 'رمز فقط باید عدد باشد'
  }

  return null
}

export async function syncAppLockFromSheet(): Promise<void> {
  const spreadsheetId = getSpreadsheetId()

  if (!spreadsheetId) return

  const remote = await fetchAppLockFromSheet(spreadsheetId)

  const local = getAccountConfig()

  if (!remote) {
    if (local?.enabled && local.pinHash && local.pinSalt) {
      await saveAppLockToSheet(spreadsheetId, local)
    }

    return
  }

  if (!remote.enabled || !remote.pinHash || !remote.pinSalt) {
    if (local?.enabled) {
      clearAccountConfig()
      window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT, { detail: { enabled: false } }))
    }

    return
  }

  const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0

  const localTime = local?.updatedAt ? Date.parse(local.updatedAt) : 0

  if (!local || remoteTime >= localTime) {
    saveAccountConfig(remote)
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
    updatedAt: new Date().toISOString()
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

  return hash === config.pinHash
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
    updatedAt: new Date().toISOString()
  }

  saveAccountConfig(updated)
  await syncAccountToSheet(updated)
}

export async function disableBiometric(pin: string): Promise<void> {
  const valid = await verifyPin(pin)

  if (!valid) throw new Error('رمز اشتباه است')

  clearBiometricConfig()
}
