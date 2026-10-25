import { registerConnectedSheet } from './buildingConnect'
import { getSpreadsheets } from './settings'
import { forgetSharedLocal } from './sharedLeave'
import {
  ONE_SHARED_ACCOUNT_MESSAGE,
  SHARED_NAME_PREFIX,
  WORKSPACE_SHARED_VALUE
} from './sharedWorkspace'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { formatSpreadsheetTitle, getSpreadsheetLabel } from './spreadsheetCatalog'
import { switchActiveSpreadsheet } from './spreadsheetSetup'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { isSharedEntry, sharedSpreadsheetId, workspaceTypeOfRows } from './workspace'
import type { SpreadsheetEntry } from '../types'

export const NOT_A_SHARED_MESSAGE = 'این شیت حساب مشترک نیست'

/** Drive sheets named «حسابداری · مشترک …» that this device has not registered yet. */
export function sharedConnectCandidates(entries: SpreadsheetEntry[]): SpreadsheetEntry[] {
  return entries.filter(
    entry => !isSharedEntry(entry) && getSpreadsheetLabel(entry.name).startsWith(SHARED_NAME_PREFIX)
  )
}

/**
 * Another shared account is registered: any entry but the picked one that reads as shared. The
 * picker has already registered (and flagged) the picked sheet, so it cannot count itself, and
 * the first shared entry of the registry may well be the picked one.
 */
export const anotherSharedExists = (entries: SpreadsheetEntry[], pickedId: string): boolean =>
  entries.some(entry => entry.id !== pickedId && isSharedEntry(entry))

/**
 * The picker's sheet is refused: back to the previous sheet FIRST (the open sheet cannot be
 * forgotten), then, for a second shared account, the picked entry leaves the registry, its cached
 * type and its mirror.
 */
export async function undoPickedSheet(
  pickedId: string,
  previousId: string,
  forget: boolean
): Promise<void> {
  if (previousId) {
    await switchActiveSpreadsheet(previousId).catch(() => undefined)
    await moveSyncToSpreadsheet(pickedId, previousId)
  }
  if (forget) forgetSharedLocal(pickedId)
}

/** The file's own title, for a pasted link Drive's list has not shown yet. */
async function titleOf(spreadsheetId: string): Promise<string> {
  const listed = getSpreadsheets().find(sheet => sheet.id === spreadsheetId)?.name

  if (listed) return listed

  try {
    const data = await apiRequest<{ properties?: { title?: string } }>(
      `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}?fields=properties.title`
    )

    if (data.properties?.title) return data.properties.title
  } catch {
    // The name is cosmetic: the account is listed under its generic name.
  }

  return formatSpreadsheetTitle(WORKSPACE_SHARED_VALUE)
}

/**
 * «اتصال به حساب مشترک»: reads only the sheet's «تنظیمات دوره» straight from Sheets (nothing is
 * switched or written, the open sheet's mirror is not touched) and, when its «نوع فضا» row says
 * «حساب مشترک», lists it on this device as the shared account. Returns false for any other
 * sheet; throws when it cannot be read or when this device already has another shared account.
 */
export async function connectSharedAccount(
  spreadsheetId: string,
  title?: string
): Promise<boolean> {
  const current = sharedSpreadsheetId()

  if (current && current !== spreadsheetId) throw new Error(ONE_SHARED_ACCOUNT_MESSAGE)

  const fetched = await batchFetchSheetRangesFromApi(spreadsheetId, [PERIOD_SETTINGS_SHEET])

  if (workspaceTypeOfRows((fetched.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1)) !== 'shared')
    return false

  registerConnectedSheet(spreadsheetId, 'shared', title || (await titleOf(spreadsheetId)))

  return true
}
