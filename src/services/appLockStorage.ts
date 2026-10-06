import { getUserEmail } from './auth'
import { getSettings } from './settings'
import { getItem, removeItem, setItem, STORAGE_KEYS } from './storage'
import type { AppLockAccountConfig, AppLockConfig, AppLockDeviceConfig } from '../types'

export const APP_LOCK_CHANGED_EVENT = 'accounting-app-lock-changed'

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Moves biometric fields from the pre-split record into the device config. Only
 * runs while those fields are still present, and keeps every other field
 * (`updatedAt`, owner, PIN length) intact.
 */
function migrateLegacyConfig(): void {
  const legacy = getItem<AppLockConfig>(STORAGE_KEYS.APP_LOCK)

  if (!legacy || !('biometricEnabled' in legacy || 'credentialId' in legacy)) return

  const existingDevice = getItem<AppLockDeviceConfig>(STORAGE_KEYS.APP_LOCK_DEVICE)

  if (!existingDevice && (legacy.biometricEnabled || legacy.credentialId)) {
    setItem(STORAGE_KEYS.APP_LOCK_DEVICE, {
      biometricEnabled: legacy.biometricEnabled,
      credentialId: legacy.credentialId
    })
  }

  const { biometricEnabled: _biometric, credentialId: _credential, ...account } = legacy

  setItem(STORAGE_KEYS.APP_LOCK, account)
}

/**
 * The local lock belongs to one Google account. A config without an owner
 * predates owner tracking and is adopted by whoever is signed in, so existing
 * users keep their PIN; a config owned by another account is discarded.
 */
export function getAccountConfig(): AppLockAccountConfig | null {
  migrateLegacyConfig()

  const config = getItem<AppLockAccountConfig>(STORAGE_KEYS.APP_LOCK)

  if (!config) return null

  const email = normalizeEmail(getUserEmail())

  if (!email) return config

  const owner = normalizeEmail(config.ownerEmail)

  if (!owner) {
    const adopted = { ...config, ownerEmail: email }

    setItem(STORAGE_KEYS.APP_LOCK, adopted)

    return adopted
  }

  if (owner !== email) {
    removeItem(STORAGE_KEYS.APP_LOCK)
    removeItem(STORAGE_KEYS.APP_LOCK_DEVICE)

    return null
  }

  return config
}

export function getDeviceConfig(): AppLockDeviceConfig | null {
  return getItem<AppLockDeviceConfig>(STORAGE_KEYS.APP_LOCK_DEVICE)
}

export function saveAccountConfig(config: AppLockAccountConfig): void {
  const previous = getAccountConfig()
  const nextEnabled = !!(config.enabled && config.pinHash && config.pinSalt)
  const previousEnabled = !!(previous?.enabled && previous?.pinHash && previous?.pinSalt)
  const email = normalizeEmail(getUserEmail())

  setItem(STORAGE_KEYS.APP_LOCK, email ? { ...config, ownerEmail: email } : config)

  if (nextEnabled !== previousEnabled) {
    window.dispatchEvent(
      new CustomEvent(APP_LOCK_CHANGED_EVENT, {
        detail: { enabled: nextEnabled }
      })
    )
  }
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
