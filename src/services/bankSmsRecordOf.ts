import { dropSmsCoverage, recordOfSms } from './bankSmsCoverageStore'
import { sheetHasRowId } from './freshRow'
import { getSettings } from './settings'
import { fetchRecords } from './sheets'

/**
 * The record this SMS was already turned into, but only while that record still exists: a save
 * that failed halfway is finished (no second record), while one whose record the user deleted
 * since starts again and writes a new record and balance. A stale entry is forgotten. When the
 * records cannot be read the stored id is trusted: a missing record is better than a second one.
 */
export async function liveRecordOfSms(
  spreadsheetId: string,
  smsId: string,
  type: 'income' | 'expense'
): Promise<string> {
  const stored = recordOfSms(smsId)

  if (!stored) return ''

  const form = getSettings()?.forms.find(item => item.type === type)

  if (!form) return stored

  const records = await fetchRecords(spreadsheetId, form).catch(() => null)

  if (!records || records.some(record => record.id === stored)) return stored

  // Not in THIS tab's copy: another tab or device may have just written it, so the sheet is asked.
  // Only a sheet that does hold it keeps the entry: when it cannot be read (offline, a delete still
  // queued) the record is taken as deleted here, like the user who deleted it expects (N2).
  if ((await sheetHasRowId(spreadsheetId, form.sheetName, stored)) === true) return stored

  dropSmsCoverage(smsId)

  return ''
}
