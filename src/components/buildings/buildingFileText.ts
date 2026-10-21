import { getSettings } from '../../services/settings'

/** A building is its own Google Sheets file; these lines say so in plain words (round 11). */
export const OWN_FILE_CREATE_NOTE =
  'برای این ساختمان یک فایل جدید در Google Drive ساخته می‌شود؛ حساب شخصی‌ات دست نمی‌خورد. ممکن است کمی طول بکشد.'

export const OPEN_FILE_LABEL = 'باز کردن در Google Sheets'

export const FILE_ROW_TITLE = 'فایل ساختمان در Google Drive'

/** The summary line of the journey: where the building lives now. */
export function ownFileSummary(fileName: string): string {
  return `این ساختمان فایل جداگانهٔ خودش را در Google Drive دارد${
    fileName ? ` («${fileName}»)` : ''
  }؛ حساب شخصی‌ات دست نمی‌خورد.`
}

/** The Drive file name of a registered spreadsheet («حسابداری · ساختمان …»); empty when unknown. */
export function spreadsheetFileName(spreadsheetId: string): string {
  return getSettings()?.spreadsheets?.find(entry => entry.id === spreadsheetId)?.name ?? ''
}
