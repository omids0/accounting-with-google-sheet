import { addChild, getChild, type ChildRecord } from './childrenRegistry'
import { getSpreadsheets } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getSpreadsheetLabel } from './spreadsheetCatalog'
import { isChildEntry, workspaceTypeOfRows } from './workspace'

export const NOT_A_PERSONAL_SHEET_MESSAGE = 'این شیت حساب شخصی یک فرد نیست'

export const OWN_SHEET_AS_CHILD_MESSAGE =
  'این شیت از قبل در این دستگاه ثبت شده و نمی‌تواند حساب فرزند باشد'

/**
 * Parent side: «اتصال حساب فرزند». Reads only the sheet's «تنظیمات دوره» straight from Sheets
 * (nothing is switched or written, the open sheet's mirror is untouched). When its «نوع فضا» row
 * says personal (no row = personal) the sheet is registered as a child (`addChild`: device-local
 * kind `child`, mirrored into the settings list) and the record is returned. Several children are
 * allowed; connecting one again only updates its name.
 *
 * Returns null for a building or a shared account sheet, or for a file without «تنظیمات دوره»
 * (not an accounting file). Throws when the sheet cannot be read (no access, offline) or when this
 * device already lists the sheet as something else (the parent's own books, a building, ...).
 * `name` defaults to the previous record's name, else the sheet title the picker gave, else
 * «فرزند».
 */
export async function connectChildAccount(
  spreadsheetId: string,
  name?: string,
  options: { email?: string; title?: string } = {}
): Promise<ChildRecord | null> {
  const listed = getSpreadsheets().find(sheet => sheet.id === spreadsheetId)

  if (listed && !isChildEntry(listed)) throw new Error(OWN_SHEET_AS_CHILD_MESSAGE)

  const fetched = await batchFetchSheetRangesFromApi(spreadsheetId, [PERIOD_SETTINGS_SHEET])

  const rows = fetched.get(PERIOD_SETTINGS_SHEET) ?? []

  if (rows.length === 0 || workspaceTypeOfRows(rows.slice(1)) !== 'personal') return null

  const title = options.title ? getSpreadsheetLabel(options.title) : ''

  return addChild({
    id: spreadsheetId,
    name: name?.trim() || getChild(spreadsheetId)?.name || title || 'فرزند',
    email: options.email
  })
}
