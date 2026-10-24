import { getSettings } from './settings'
import { initializeSheetSync } from './sheetSync'
import { hasStoreData, hydrateStore } from './spreadsheetStore'

/**
 * Start-up found the token expired and nothing answered to renew it (offline). When this
 * device holds the user's cached data the app opens on it instead of the login page, and
 * sync starts so the queue flushes the moment a token comes back.
 *
 * The cache is read from IndexedDB here if the start-up read has not finished yet: the
 * check must not depend on which of the two got there first.
 */
export async function startOfflineFromCache(): Promise<boolean> {
  const cachedId = getSettings()?.spreadsheetId

  if (!cachedId) return false

  if (!hasStoreData(cachedId)) await hydrateStore(cachedId)
  if (!hasStoreData(cachedId)) return false

  void initializeSheetSync(cachedId).catch(() => undefined)

  return true
}
