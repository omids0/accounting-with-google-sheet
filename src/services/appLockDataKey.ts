import { getItem, STORAGE_KEYS } from './storage'

/**
 * The unlocked data key (DEK). It only ever lives in this module's memory: it
 * is set after a PIN or biometric unlock and dropped when the app locks.
 */
let dataKey: CryptoKey | null = null

const keyListeners = new Set<(key: CryptoKey | null) => void>()

const beforeReleaseListeners = new Set<() => void>()

export function getDataKey(): CryptoKey | null {
  return dataKey
}

export function hasDataKey(): boolean {
  return dataKey !== null
}

export function setDataKey(key: CryptoKey): void {
  dataKey = key
  for (const listener of keyListeners) listener(key)
}

/**
 * Forgets the key. Listeners registered with {@link onBeforeDataKeyRelease} run
 * first, so a pending write can still be encrypted with it.
 */
export function clearDataKey(): void {
  if (!dataKey) return

  for (const listener of beforeReleaseListeners) listener()
  dataKey = null
  for (const listener of keyListeners) listener(null)
}

export function onDataKeyChange(listener: (key: CryptoKey | null) => void): () => void {
  keyListeners.add(listener)

  return () => keyListeners.delete(listener)
}

export function onBeforeDataKeyRelease(listener: () => void): () => void {
  beforeReleaseListeners.add(listener)

  return () => beforeReleaseListeners.delete(listener)
}

/**
 * True once this device's lock holds a vault: sheet data may then only be
 * written encrypted, and nothing is written while the key is not in memory.
 * Read straight from storage so the persistence layer needs no app-lock imports.
 */
export function isEncryptionRequired(): boolean {
  const config = getItem<{ enabled?: boolean; vault?: unknown }>(STORAGE_KEYS.APP_LOCK)

  return !!(config?.enabled && config.vault)
}
