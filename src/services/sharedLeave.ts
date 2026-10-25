import { getUserEmail } from './auth'
import { INVITE_ROW_PREFIX } from './buildingInvites'
import { ACCESS_ROW_PREFIX, parseMembers, ROLE_ROW_PREFIX } from './buildingRoles'
import { deleteMemberSettings } from './buildingSettings'
import { unshareFile } from './driveShare'
import { registryOf } from './memberRegistry'
import { hideSharedAccount, loadSharedMembers } from './sharedAccountSwitch'
import { readTarget } from './sharedLink'
import { columnsOf } from './sharedLinkRows'
import { balanceOfRows } from './sharedSettlement'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { SheetsApiError } from './sheetsApi'
import { flushOutbox } from './sheetSync'
import { SHARED_PAYER_FIELD_ID, SHARED_SPLIT_FIELD_ID } from '../components/form/sharedFields'
import { sharedPair } from '../components/shared/sharedViewModel'

/** Shown when Drive keeps the leaver's share: the rest is done, the share is theirs to remove. */
export const LEAVE_FALLBACK_MESSAGE =
  'گوگل اجازهٔ ترک مستقیم را نداد؛ دسترسی خودتان را در گوگل‌درایو بردارید'

/**
 * «ترک این فضا» (a partner or a viewer; never the owner, who turns the account off instead):
 * takes the own Drive share back and hides the account on this device. When Drive refuses
 * (`drive.file` may not cover self-removal: 403/404), the own member rows go instead (best effort;
 * a read-only viewer cannot write them) and the account is hidden all the same: 'fallback', the
 * user removes the share in Drive. Any other failure leaves everything as it was. The records the
 * leaver wrote stay.
 */
export async function leaveSharedAccount(spreadsheetId: string): Promise<'removed' | 'fallback'> {
  const email = (getUserEmail() ?? '').trim().toLowerCase()

  const own = (await loadSharedMembers(spreadsheetId)).find(member => member.email === email)

  if (!email || own?.role === registryOf('shared').ownerRole) throw new Error('forbidden')

  let result: 'removed' | 'fallback' = 'removed'

  try {
    await unshareFile(spreadsheetId, email)
  } catch (err) {
    if (!(err instanceof SheetsApiError && (err.status === 403 || err.status === 404))) throw err
    result = 'fallback'
    await deleteMemberSettings(
      spreadsheetId,
      [ROLE_ROW_PREFIX, ACCESS_ROW_PREFIX, INVITE_ROW_PREFIX].map(prefix => prefix + email)
    ).catch(() => undefined)
    // Sent now, so leaving does not stop at «تغییرهای ارسال‌نشده» (a read-only viewer still may).
    await flushOutbox(spreadsheetId).catch(() => false)
  }

  hideSharedAccount(spreadsheetId)

  return result
}

/**
 * The balance of a shared account that is not the open spreadsheet (the owner's off sheet on
 * «فضاهای من»): one direct read of its members and expense tabs. Null = no partner yet.
 */
export async function loadSharedNet(sharedId: string): Promise<Record<string, number> | null> {
  const { read, form, tabs } = await readTarget(sharedId, 'expense')

  const pair = sharedPair(parseMembers((read.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1), 'shared'))

  if (!pair) return null

  const ids = ['amount', 'category', SHARED_PAYER_FIELD_ID, SHARED_SPLIT_FIELD_ID]

  const rows = [...tabs.values()].flatMap(([headers = [], ...data]) => {
    const columns = [...columnsOf(form, headers, ids)]

    return data.map(row => ({
      type: 'expense' as const,
      values: Object.fromEntries(columns.map(([id, column]) => [id, row[column] ?? '']))
    }))
  })

  return balanceOfRows(rows, pair).net
}
