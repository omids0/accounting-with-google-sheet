import { ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'

/**
 * Older versions synced the PIN hash to this sheet. The lock is per device now
 * and the sheet row is never read for lock decisions; the sheet itself is kept
 * so existing spreadsheets keep their layout.
 */
export const APP_LOCK_SHEET = 'قفل_اپ'
export const APP_LOCK_HEADERS = ['فعال', 'رمز_هش', 'نمک', 'زمان_بروزرسانی']

/**
 * Blanks the hash and salt cells of the old row (enabled = FALSE, fresh
 * timestamp) so the PIN hash no longer sits in the spreadsheet. The write is
 * queued through the outbox like any other edit. Returns false when the sheet
 * has no row to clean.
 */
export async function scrubAppLockSheetRow(spreadsheetId: string): Promise<boolean> {
  await ensureSheetWithHeaders(spreadsheetId, APP_LOCK_SHEET, APP_LOCK_HEADERS)

  const rows = await fetchSheetRows(spreadsheetId, APP_LOCK_SHEET)

  if (!rows.length) return false

  await updateSheetRow(spreadsheetId, APP_LOCK_SHEET, 2, [
    'FALSE',
    '',
    '',
    new Date().toISOString()
  ])

  return true
}
