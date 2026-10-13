import { UNLOCK_ATTEMPTS_KEY } from './appLockAttempts'
import { deleteBiometricKeyDatabase } from './appLockBiometricKey'
import { clearDataKey } from './appLockDataKey'
import { clearAppLockSessionState } from './appLockPolicy'
import { LOCK_SETUP_OFFER_KEY } from './appLockPrompts'
import { getSession } from './auth'
import { BACKUP_STORAGE_KEY } from './backupReminder'
import { setBankSmsCaptureEnabled } from './bankSmsNative'
import { BANK_SMS_PREFS_KEY } from './bankSmsPrefs'
import { invalidateDashboardCache } from './dashboardCache'
import { DISCOVERY_STORAGE_KEY } from './featureDiscovery'
import { GOAL_CONGRATS_STORAGE_KEY } from './goalCongrats'
import { isNativePlatform, signOutNative } from './googleAuthNative'
import { loadGoogleIdentityScript } from './googleIdentityScript'
import { ONBOARDING_STORAGE_KEY } from './onboarding'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { stopSheetSync } from './sheetSyncLifecycle'
import { clearSpreadsheetPrepareSession } from './spreadsheetSetup'
import { clearStore } from './spreadsheetStore'
import { deletePersistedDatabase } from './spreadsheetStorePersist'
import { removeItem, STORAGE_KEYS } from './storage'
import { getOutboxCount } from './syncOutbox'
import { TREASURY_CLASS_STORAGE_KEY } from './treasuryClassPref'

/** Per-spreadsheet keys: unsynced writes, legacy mirrors and sync timestamps. */
const ACCOUNT_KEY_PREFIXES = [
  'accounting_sync_outbox_',
  'accounting_sync_failed_',
  'accounting_sheet_store_',
  'accounting_sheet_synced_at_'
] as const

/** Single keys that describe the signed-in account rather than this device. */
const ACCOUNT_KEYS = [
  STORAGE_KEYS.SESSION,
  STORAGE_KEYS.APP_LOCK,
  STORAGE_KEYS.APP_LOCK_DEVICE,
  UNLOCK_ATTEMPTS_KEY,
  LOCK_SETUP_OFFER_KEY,
  'accounting_start_date',
  'accounting_activity',
  'accounting_sheets_ready',
  BANK_SMS_PREFS_KEY,
  ONBOARDING_STORAGE_KEY,
  DISCOVERY_STORAGE_KEY,
  'accounting_nudges_v1',
  BACKUP_STORAGE_KEY,
  TREASURY_CLASS_STORAGE_KEY,
  GOAL_CONGRATS_STORAGE_KEY,
  // Budget alert gate (budgetDigest.ts), named here to keep that module out of this chunk.
  'accounting_budget_alerts_v1',
  // «دسته‌های پیشنهادی» offer dismissal (categoryDefaults.ts), named here for the same reason.
  'accounting_category_defaults_offer_v1',
  // «پرتکرار» pins/hides (entryTemplates.ts), named here to keep that module out of this chunk.
  'accounting_entry_templates_v1',
  // Once-a-month digest line «N تکرار ثبت‌نشده» (recurringDigest.ts).
  'accounting_recurring_digest_v1',
  // Last global searches (searchRecent.ts), named here to keep that module out of this chunk.
  'accounting_search_recent_v1',
  // SMS reconciliation: last success, «نادیده», today's digest lines (bankSmsReconcileStore.ts).
  'accounting_reconcile_v1',
  'accounting_reconcile_digest_v1',
  // Net-worth snapshot gate: month checked and one-time rebuild (netWorthStartup.ts).
  'accounting_net_worth_v1',
  // First-of-month report row: month handled and the «گزارش ماهانه» switch (monthlyReportGate.ts).
  'accounting_monthly_report_v1',
  // «سال در یک نگاه» years closed with ✕ (yearReviewGate.ts).
  'accounting_year_review_v1',
  // «بستن سال»: cash confirmed and archive time per year (closeYearStore.ts).
  'accounting_close_year_v1'
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

  if (!accessToken) return

  // Google's script is no longer loaded at start-up, so fetch it for the revoke.
  await withTimeout(
    loadGoogleIdentityScript().then(
      () =>
        new Promise<void>(resolve => {
          const oauth2 = window.google?.accounts?.oauth2

          if (!oauth2?.revoke) {
            resolve()

            return
          }
          try {
            oauth2.revoke(accessToken, () => resolve())
          } catch {
            resolve()
          }
        })
    )
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
  clearDataKey()

  await deletePersistedDatabase()
  await deleteBiometricKeyDatabase()
  // Stop capturing bank SMS and drop the native queue: it belongs to the old account.
  await setBankSmsCaptureEnabled(false).catch(() => undefined)

  if (revokeAccess) await revokeGoogleAccess(accessToken)
}
