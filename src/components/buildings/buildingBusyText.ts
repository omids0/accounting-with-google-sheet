import { spreadsheetFileName } from './buildingFileText'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'

/** What the busy overlay says while a building opens («ساختمان برج آبی» when its name is known). */
export function enteringMessage(buildingId: string): string {
  const name = getSpreadsheetLabel(spreadsheetFileName(buildingId)).trim()

  return name ? `در حال ورود به «${name}»…` : 'در حال ورود به ساختمان…'
}

export const RETURNING_MESSAGE = 'در حال برگشت به حساب شخصی…'

/** The two waits of «ساخت ساختمان»; the no-break space keeps «Google Drive» on one line. */
export const CREATE_FILE_MESSAGE = 'در حال ساخت فایل ساختمان در Google Drive…'

export const CREATE_ENTER_MESSAGE = 'در حال آماده‌سازی…'
