import { getSettings } from './settings'
import { getItem, removeItem, setItem, STORAGE_KEYS } from './storage'
import type { AppLockAccountConfig, AppLockConfig, AppLockDeviceConfig } from '../types'

export const APP_LOCK_CHANGED_EVENT = 'accounting-app-lock-changed'

function migrateLegacyConfig(): void {
  const legacy = getItem<AppLockConfig>(STORAGE_KEYS.APP_LOCK)

  if (!legacy?.pinHash || !legacy?.pinSalt) return

  const existingDevice = getItem<AppLockDeviceConfig>(STORAGE_KEYS.APP_LOCK_DEVICE)

  if (!existingDevice && (legacy.biometricEnabled || legacy.credentialId)) {
    setItem(STORAGE_KEYS.APP_LOCK_DEVICE, {
      biometricEnabled: legacy.biometricEnabled,
      credentialId: legacy.credentialId
    })
  }

  const account: AppLockAccountConfig = {
    enabled: legacy.enabled,
    pinHash: legacy.pinHash,
    pinSalt: legacy.pinSalt
  }

  setItem(STORAGE_KEYS.APP_LOCK, account)
}

export function getAccountConfig(): AppLockAccountConfig | null {
  migrateLegacyConfig()

  return getItem<AppLockAccountConfig>(STORAGE_KEYS.APP_LOCK)
}

export function getDeviceConfig(): AppLockDeviceConfig | null {
  return getItem<AppLockDeviceConfig>(STORAGE_KEYS.APP_LOCK_DEVICE)
}

export function saveAccountConfig(config: AppLockAccountConfig): void {
  setItem(STORAGE_KEYS.APP_LOCK, config)
  window.dispatchEvent(
    new CustomEvent(APP_LOCK_CHANGED_EVENT, {
      detail: { enabled: !!(config.enabled && config.pinHash && config.pinSalt) }
    })
  )
}

export function saveDeviceConfig(config: AppLockDeviceConfig): void {
  setItem(STORAGE_KEYS.APP_LOCK_DEVICE, config)
}

export function getSpreadsheetId(): string | null {
  return getSettings()?.spreadsheetId || null
}

export function clearAccountConfig(): void {
  removeItem(STORAGE_KEYS.APP_LOCK)
}

export function clearDeviceConfig(): void {
  removeItem(STORAGE_KEYS.APP_LOCK_DEVICE)
}
