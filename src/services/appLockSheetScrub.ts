import { getAccountConfig, getSpreadsheetId } from './appLockStorage'
import { scrubAppLockSheetRow } from './appLockSync'
import { getUserEmail } from './auth'
import { getItem, setItem } from './storage'
import { isPersonalWorkspace } from './workspace'

const SCRUBBED_KEY_PREFIX = 'accounting_app_lock_sheet_scrubbed_'

let inFlight: Promise<void> | null = null

/**
 * Once per device and spreadsheet: a device that has a local lock config
 * removes the PIN hash an older version wrote into the «قفل_اپ» sheet.
 */
export function scrubPinHashFromSheetOnce(): Promise<void> {
  if (inFlight) return inFlight

  const spreadsheetId = getSpreadsheetId()

  // Buildings and shared accounts came after the PIN left the sheet: never add «قفل_اپ» to them.
  if (!spreadsheetId || !getUserEmail() || !isPersonalWorkspace(spreadsheetId)) {
    return Promise.resolve()
  }

  const flagKey = `${SCRUBBED_KEY_PREFIX}${spreadsheetId}`

  if (getItem<boolean>(flagKey) || !getAccountConfig()) return Promise.resolve()

  inFlight = scrubAppLockSheetRow(spreadsheetId)
    .then(() => setItem(flagKey, true))
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
