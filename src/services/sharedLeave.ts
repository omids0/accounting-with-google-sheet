import { getUserEmail } from './auth'
import { INVITE_ROW_PREFIX } from './buildingInvites'
import { ACCESS_ROW_PREFIX, parseMembers, ROLE_ROW_PREFIX } from './buildingRoles'
import { deleteMemberSettings } from './buildingSettings'
import { listSharedEmails, unshareFile } from './driveShare'
import { registryOf } from './memberRegistry'
import { getSettings } from './settings'
import { forgetSharedAccount, hideSharedAccount, loadSharedMembers } from './sharedAccountSwitch'
import { readTarget } from './sharedLink'
import { columnsOf } from './sharedLinkRows'
import { balanceOfRows } from './sharedSettlement'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { SheetsApiError } from './sheetsApi'
import { flushOutbox } from './sheetSync'
import { clearStore } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import { clearOutbox } from './syncOutbox'
import { WORKSPACE_STORAGE_KEY } from './workspace'
import { SHARED_PAYER_FIELD_ID, SHARED_SPLIT_FIELD_ID } from '../components/form/sharedFields'
import { sharedPair } from '../components/shared/sharedViewModel'

/** Shown when Drive keeps the leaver's share: the rest is done, the share is theirs to remove. */
export const LEAVE_FALLBACK_MESSAGE =
  'گوگل اجازهٔ ترک مستقیم را نداد؛ دسترسی خودتان را در گوگل‌درایو بردارید'

/** Drive refused (403) or no longer shows the file (404). */
const refused = (err: unknown) =>
  err instanceof SheetsApiError && (err.status === 403 || err.status === 404)

/**
 * «ترک این فضا» (a partner or a viewer; never the owner, who turns the account off instead).
 * What this device still has queued for the sheet is sent first. Then the own Drive share goes,
 * checked against Drive's list before and after: 'removed' only when Drive listed the user and no
 * longer does. Otherwise (Drive refuses — `drive.file` may not cover self-removal — or the share
 * cannot be seen) the own member rows go instead (best effort; a read-only viewer cannot write
 * them): 'fallback', the user removes the share in Drive. Both hide the account at once; the
 * caller unregisters it with `forgetSharedLocal` once the personal sheet is open. Any other
 * failure leaves everything as it was. The records the leaver wrote stay.
 */
export async function leaveSharedAccount(spreadsheetId: string): Promise<'removed' | 'fallback'> {
  const email = (getUserEmail() ?? '').trim().toLowerCase()

  const own = (await loadSharedMembers(spreadsheetId)).find(member => member.email === email)

  if (!email || own?.role === registryOf('shared').ownerRole) throw new Error('forbidden')

  const flush = () => flushOutbox(spreadsheetId).catch(() => false)
  const listed = async () => (await listSharedEmails(spreadsheetId)).includes(email)

  await flush()

  let removed = false

  try {
    if (await listed()) {
      await unshareFile(spreadsheetId, email)
      // Unreadable now (403/404) = the access is gone. Any other failure of the re-check never
      // throws: the unshare went through but cannot be confirmed, so 'fallback'.
      removed = await listed().then(still => !still, refused)
    }
  } catch (err) {
    if (!refused(err)) throw err
  }

  if (!removed) {
    await deleteMemberSettings(
      spreadsheetId,
      [ROLE_ROW_PREFIX, ACCESS_ROW_PREFIX, INVITE_ROW_PREFIX].map(prefix => prefix + email)
    ).catch(() => undefined)
    await flush()
  }

  // What still could not be sent is moot once the user has left: the switch must not stop at
  // «تغییرهای ارسال‌نشده».
  clearOutbox(spreadsheetId)
  hideSharedAccount(spreadsheetId)

  return removed ? 'removed' : 'fallback'
}

/**
 * Once the personal sheet is open: the left account leaves this device's registry, its cached
 * type and its mirror, so «فضاهای من» offers «راه‌اندازی» / «اتصال» again. Never while it is
 * still the open sheet: `normalizeSettings` would quietly make another registered sheet active.
 */
export function forgetSharedLocal(spreadsheetId: string): void {
  if (getSettings()?.spreadsheetId === spreadsheetId) return

  const types = { ...getItem<Record<string, string>>(WORKSPACE_STORAGE_KEY) }

  delete types[spreadsheetId]
  setItem(WORKSPACE_STORAGE_KEY, types)
  forgetSharedAccount(spreadsheetId)
  clearStore(spreadsheetId)
}

/**
 * The balance of a shared account that is not the open spreadsheet (the owner's off sheet on
 * «فضاهای من»): one direct read of its members and expense tabs. Null = nobody to owe.
 */
export async function loadSharedNet(sharedId: string): Promise<Record<string, number> | null> {
  const { read, form, tabs } = await readTarget(sharedId, 'expense')

  const ids = ['amount', 'category', SHARED_PAYER_FIELD_ID, SHARED_SPLIT_FIELD_ID]

  const rows = [...tabs.values()].flatMap(([headers = [], ...data]) => {
    const columns = [...columnsOf(form, headers, ids)]

    return data.map(row => ({
      type: 'expense' as const,
      values: Object.fromEntries(columns.map(([id, column]) => [id, row[column] ?? '']))
    }))
  })

  const members = parseMembers((read.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1), 'shared')
  const pair = sharedPair(members, rows)

  return pair && balanceOfRows(rows, pair).net
}
