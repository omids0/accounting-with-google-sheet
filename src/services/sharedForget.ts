import { getSettings, getSpreadsheets } from './settings'
import { clearSharedAccessLost } from './sharedAccessLost'
import { forgetSharedLocal } from './sharedLeave'
import { switchActiveSpreadsheet } from './spreadsheetSetup'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { personalSpreadsheet } from './workspace'
import { bumpSpreadsheetKey } from '../stores/appStore'

/**
 * «پاک کردن از این دستگاه» for a shared account this device cannot open (the owner removed the
 * user, or the device has no grant for the file). Only this device forgets it: the file, the owner
 * and the personal books stay untouched, and the one-account rule lets another be set up or
 * connected afterwards. The account cannot be forgotten while it is the open sheet, so the
 * personal sheet is opened first. Unsent changes for the dead file are left queued (nothing
 * sends them, and they go out if the account is connected again). Returns false when nothing was
 * forgotten: the account is still open and no personal sheet could take its place.
 */
export async function forgetUnreachableShared(spreadsheetId: string): Promise<boolean> {
  const openId = getSettings()?.spreadsheetId ?? ''

  if (openId === spreadsheetId) {
    const personal = personalSpreadsheet(getSpreadsheets())

    if (!personal) return false
    await switchActiveSpreadsheet(personal.id)
    await moveSyncToSpreadsheet(spreadsheetId, personal.id)
    bumpSpreadsheetKey()
  }

  forgetSharedLocal(spreadsheetId)
  clearSharedAccessLost(spreadsheetId)

  return true
}
