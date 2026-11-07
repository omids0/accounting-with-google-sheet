import { getUserEmail } from './auth'
import { addChild, getChild, type ChildRecord } from './childrenRegistry'
import { getDriveFileAccess } from './drive'
import { isPickerAvailable } from './googlePicker'
import { getSpreadsheets } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getSpreadsheetLabel } from './spreadsheetCatalog'
import { isChildEntry, workspaceTypeOfRows } from './workspace'
import { isolateLatin } from '../utils/bidiIsolate'
import { toUserMessage, USER_MESSAGES } from '../utils/userMessage'

export const NOT_A_PERSONAL_SHEET_MESSAGE = 'این شیت حساب شخصی یک فرد نیست'

export const OWN_SHEET_AS_CHILD_MESSAGE =
  'این شیت از قبل در این دستگاه ثبت شده و نمی‌تواند حساب فرزند باشد'

export const OWN_DRIVE_SHEET_MESSAGE = 'این شیت مال خود شماست؛ در حساب خودتان باز می‌شود'

/**
 * The generic «با همان حساب گوگلی که شیت را ساخته وارد شوید» is wrong for a parent: the sheet is the
 * child's. What is missing is the child's share, with the e-mail of the account the parent is in.
 */
export function childConnectNoAccessMessage(email: string | null | undefined): string {
  const who = email?.trim() ? ` (${isolateLatin(email.trim())})` : ''

  return `به این شیت دسترسی ندارید؛ فرزندتان باید ابتدا شیت را با ایمیل همین حساب گوگل${who} به اشتراک بگذارد.`
}

/**
 * Under the app's narrow Drive scope a sheet someone else shared is invisible (a 404, not a 403)
 * until it is opened once through the Google Picker, which exists on the web only.
 */
export function childConnectNotOpenedMessage(pickerAvailable = isPickerAvailable()): string {
  const how = pickerAvailable ? 'دکمهٔ' : 'در نسخهٔ وب اپ'

  return `این شیت هنوز برای اپ باز نشده؛ ${how} «باز کردن شیت با گوگل» را بزنید و شیت را از «به اشتراک گذاشته‌شده با من» انتخاب کنید`
}

/**
 * A sheet Drive says the user owns or can edit is their own book (a teenager adding their own
 * sheet on a second device), never a child's read-only copy. When Drive cannot be asked (offline)
 * or does not say, the sheet the parent was just given still connects.
 */
async function assertNotOwnDriveFile(spreadsheetId: string): Promise<void> {
  let access: Awaited<ReturnType<typeof getDriveFileAccess>>

  try {
    access = await getDriveFileAccess(spreadsheetId)
  } catch {
    return
  }
  if (access.ownedByMe === true) {
    throw new Error(OWN_DRIVE_SHEET_MESSAGE)
  }
}

/**
 * Parent side: «اتصال حساب فرزند». Reads only the sheet's «تنظیمات دوره» straight from Sheets
 * (nothing is switched or written, the open sheet's mirror is untouched). When its «نوع فضا» row
 * says personal (no row = personal) the sheet is registered as a child (`addChild`: device-local
 * kind `child`, mirrored into the settings list) and the record is returned. Several children are
 * allowed; connecting one again only updates its name.
 *
 * Throws `OWN_DRIVE_SHEET_MESSAGE` when Drive says the user owns the file.
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

  await assertNotOwnDriveFile(spreadsheetId)

  let fetched: Awaited<ReturnType<typeof batchFetchSheetRangesFromApi>>

  try {
    fetched = await batchFetchSheetRangesFromApi(spreadsheetId, [PERIOD_SETTINGS_SHEET])
  } catch (err) {
    const message = toUserMessage(err, '')

    if (message === USER_MESSAGES.noAccess) {
      throw new Error(childConnectNoAccessMessage(getUserEmail()))
    }
    if (message === USER_MESSAGES.notFound) throw new Error(childConnectNotOpenedMessage())
    throw err
  }

  const rows = fetched.get(PERIOD_SETTINGS_SHEET) ?? []

  if (rows.length === 0 || workspaceTypeOfRows(rows.slice(1)) !== 'personal') return null

  const title = options.title ? getSpreadsheetLabel(options.title) : ''

  return addChild({
    id: spreadsheetId,
    name: name?.trim() || getChild(spreadsheetId)?.name || title || 'فرزند',
    email: options.email
  })
}
