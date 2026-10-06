import type { SpreadsheetEntry } from '../types'

/**
 * The app only holds the drive.file scope, so it can open a spreadsheet only if
 * it created it or the user picked it through Google Picker. A sheet the user
 * copied by hand in Drive is invisible to it. Session resolution records that
 * sheet here so the setup screen can explain why and offer a way out, without
 * App.tsx having to thread a new status through.
 */
let inaccessible: SpreadsheetEntry | null = null

export function markSpreadsheetInaccessible(entry: SpreadsheetEntry): void {
  inaccessible = entry
}

export function getInaccessibleSpreadsheet(): SpreadsheetEntry | null {
  return inaccessible
}

export function clearInaccessibleSpreadsheet(): void {
  inaccessible = null
}

export const SPREADSHEET_NO_ACCESS_MESSAGE =
  'این شیت پیدا نشد یا اپ اجازهٔ باز کردنش را ندارد. اپ فقط به شیت‌هایی دسترسی دارد که خودش ساخته یا شما با «باز کردن شیت با گوگل» انتخاب کرده‌اید.'
