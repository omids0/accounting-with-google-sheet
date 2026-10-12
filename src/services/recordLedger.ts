import { getDateFieldId } from './dashboardAggregation'
import { parseCreatedAtMs, type LedgerEntry } from './recordDuplicates'
import { fetchRecords, type SheetRecord } from './sheets'
import { WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import type { AppSettings, CustomForm } from '../types'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

export function recordToLedgerEntry(form: CustomForm, record: SheetRecord): LedgerEntry {
  return {
    type: form.type as LedgerEntry['type'],
    amount: parseNumeric(record.values.amount),
    date: normalizeSheetDate(record.values[getDateFieldId(form)] ?? ''),
    accountId: record.values[WALLET_ACCOUNT_FIELD_ID] ?? '',
    id: record.id,
    category: record.values.category ?? '',
    createdAtMs: parseCreatedAtMs(record.createdAt)
  }
}

/** Every income/expense record (archives included), for duplicate detection. */
export async function loadRecordLedger(
  settings: AppSettings,
  type?: LedgerEntry['type']
): Promise<LedgerEntry[]> {
  const forms = settings.forms.filter(
    form => (form.type === 'income' || form.type === 'expense') && (!type || form.type === type)
  )
  const perForm = await Promise.all(
    forms.map(async form =>
      (
        await fetchRecords(settings.spreadsheetId, form)
      ).map(record => recordToLedgerEntry(form, record))
    )
  )

  return perForm.flat()
}
