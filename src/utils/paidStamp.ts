import { formatIsoDatePersian } from './jalaliDate'
import { normalizeSheetDate } from './sheetValues'

/**
 * A payment's date for display. New payments are stamped with an ISO day; old ones with the
 * Persian locale string of that moment («۱۴۰۵/۷/۲۰، ۱۰:۳۰:۰۰»), whose day is read and shown like
 * any other date. A stamp that cannot be read is shown as it is.
 */
export function formatPaidStamp(stamp: string): string {
  const text = (stamp ?? '').trim()

  if (!text) return '—'

  const day = normalizeSheetDate(text.split(/[،,\s]/)[0])

  return day ? formatIsoDatePersian(day) : text
}
