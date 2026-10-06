import { UNLOCK_ATTEMPTS_KEY } from './appLockAttempts'
import { clearAppLockSessionState } from './appLockPolicy'
import { getSession } from './auth'
import { invalidateDashboardCache } from './dashboardCache'
import { isNativePlatform, signOutNative } from './googleAuthNative'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { stopSheetSync } from './sheetSyncLifecycle'
import { clearSpreadsheetPrepareSession } from './spreadsheetSetup'
import { clearStore } from './spreadsheetStore'
import { deletePersistedDatabase } from './spreadsheetStorePersist'
import { removeItem, STORAGE_KEYS } from './storage'
import { getOutboxCount } from './syncOutbox'

/** Per-spreadsheet keys: unsynced writes, legacy mirrors and sync timestamps. */
const ACCOUNT_KEY_PREFIXES = [
  'accounting_sync_outbox_',
  'accounting_sheet_store_',
  'accounting_sheet_synced_at_'
] as const

/** Single keys that describe the signed-in account rather than this device. */
const ACCOUNT_KEYS = [
  STORAGE_KEYS.SESSION,
  STORAGE_KEYS.APP_LOCK,
  STORAGE_KEYS.APP_LOCK_DEVICE,
  UNLOCK_ATTEMPTS_KEY,
  'accounting_start_date',
  'accounting_activity'
] as const

const REVOKE_TIMEOUT_MS = 3000

/** Writes for the active spreadsheet that have not reached Google Sheets yet. */
export function getPendingSyncCount(): number {
  const spreadsheetId = getSettings()?.spreadsheetId

  return spreadsheetId ? getOutboxCount(spreadsheetId) : 0
}

function removeKeysWithPrefixes(prefixes: readonly string[]): void {
  const keys: string[] = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (key && prefixes.some(prefix => key.startsWith(prefix))) keys.push(key)
    }
  } catch {
    return
  }

  for (const key of keys) removeItem(key)
}

/** Keeps device preferences (theme, currency); everything tied to the account goes. */
function resetAccountSettings(): void {
  const settings = getSettings()

  if (!settings) return

  saveSettings({
    ...getDefaultSettings(),
    theme: settings.theme,
    currency: settings.currency
  })
}

function withTimeout(task: Promise<void>): Promise<void> {
  return Promise.race([task, new Promise<void>(resolve => setTimeout(resolve, REVOKE_TIMEOUT_MS))])
}

async function revokeGoogleAccess(accessToken: string | null): Promise<void> {
  if (isNativePlatform()) {
    await withTimeout(signOutNative())

    return
  }

  const oauth2 = window.google?.accounts?.oauth2

  if (!accessToken || !oauth2?.revoke) return

  await withTimeout(
    new Promise<void>(resolve => {
      try {
        oauth2.revoke?.(accessToken, () => resolve())
      } catch {
        resolve()
      }
    })
  )
}

/**
 * Removes everything this device holds for the signed-in Google account —
 * session, sheet mirror (IndexedDB + legacy keys), unsynced outbox, caches and
 * app lock — and revokes the OAuth grant. Unsynced writes are lost, so callers
 * must confirm with the user when {@link getPendingSyncCount} is non-zero.
 *
 * Pass `revokeAccess: false` when another account has just signed in natively,
 * so its fresh sign-in is not undone.
 */
export async function clearAllLocalData({ revokeAccess = true } = {}): Promise<void> {
  const accessToken = getSession()?.accessToken ?? null

  const spreadsheetId = getSettings()?.spreadsheetId

  stopSheetSync()

  for (const key of ACCOUNT_KEYS) removeItem(key)

  removeKeysWithPrefixes(ACCOUNT_KEY_PREFIXES)

  if (spreadsheetId) clearStore(spreadsheetId)

  resetAccountSettings()
  invalidateDashboardCache()
  clearSpreadsheetPrepareSession()
  clearAppLockSessionState()

  await deletePersistedDatabase()

  if (revokeAccess) await revokeGoogleAccess(accessToken)
}
