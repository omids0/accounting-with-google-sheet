import { getUserEmail } from './auth'
import { clearChildAccessLost } from './childAccessLost'
import { removeChild } from './childrenRegistry'
import { listSharedEmails, unshareFile } from './driveShare'
import { getSettings, getSpreadsheets } from './settings'
import { switchActiveSpreadsheet } from './spreadsheetSetup'
import { clearStore } from './spreadsheetStore'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { personalSpreadsheet } from './workspace'
import { bumpSpreadsheetKey } from '../stores/appStore'
import { normalizeEmail } from '../utils/email'

/**
 * Parent side: «حذف فرزند». The parent ends the monitoring (only the parent can, the child has no
 * button for it). Order matters: the own Drive permission goes first, while the file is still
 * reachable (best effort: Drive may refuse a reader, or the child may have unshared already, both
 * ignored), then the personal sheet is opened if the child is the open sheet (the open sheet
 * cannot be forgotten), then the registry entry, the settings mirror, the cached type, the
 * downloaded copy and the access-lost flag go. The child's file and records are never touched.
 *
 * Resolves to 'removed' (Drive permission removed too), 'local' (forgotten on this device only;
 * the share stays in the child's Drive until the parent removes it there) or 'blocked' (the child
 * is the open sheet and no personal sheet could take its place: nothing was changed).
 */
export async function forgetChild(spreadsheetId: string): Promise<'removed' | 'local' | 'blocked'> {
  const openId = getSettings()?.spreadsheetId ?? ''

  const personal = personalSpreadsheet(getSpreadsheets())

  if (openId === spreadsheetId && !personal) return 'blocked'

  const email = normalizeEmail(getUserEmail())

  let removed = false

  if (email) {
    try {
      // 'removed' only when Drive listed the parent's permission and it was taken back.
      if ((await listSharedEmails(spreadsheetId)).includes(email)) {
        await unshareFile(spreadsheetId, email)
        removed = true
      }
    } catch {
      // Drive refused or the share is gone: the parent forgets the child locally anyway.
    }
  }

  if (openId === spreadsheetId && personal) {
    await switchActiveSpreadsheet(personal.id)
    await moveSyncToSpreadsheet(spreadsheetId, personal.id)
    bumpSpreadsheetKey()
  }

  removeChild(spreadsheetId)
  clearStore(spreadsheetId)
  clearChildAccessLost(spreadsheetId)

  return removed ? 'removed' : 'local'
}
