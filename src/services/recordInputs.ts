import { getDateFieldId } from './dashboardAggregation'
import { parseCreatedAtMs } from './recordDuplicates'
import { fetchRecords, type SheetRecord } from './sheets'
import {
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  SUBCATEGORY_FIELD_ID
} from '../components/form/fieldUtils'
import type { AppSettings, CustomForm } from '../types'
import { parseLineItems, type LineItem } from '../utils/lineItems'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

/** An income/expense record reduced to what suggestions, reports and filters read. */
export interface RecordInput {
  id: string
  type: 'income' | 'expense'
  /** `YYYY-MM-DD` */
  date: string
  category: string
  subCategory: string
  title: string
  amount: number
  /** Counterparty name; '' when none. */
  counterparty: string
  items: LineItem[]
  createdAtMs: number | null
}

export function toRecordInput(form: CustomForm, record: SheetRecord): RecordInput {
  const { values } = record

  return {
    id: record.id,
    type: form.type === 'income' ? 'income' : 'expense',
    date: normalizeSheetDate(values[getDateFieldId(form)] ?? ''),
    category: values.category ?? '',
    subCategory: values[SUBCATEGORY_FIELD_ID] ?? '',
    title: values.title ?? '',
    amount: parseNumeric(values.amount),
    counterparty: (values[COUNTERPARTY_FIELD_ID] ?? '').trim(),
    items: parseLineItems(values[LINE_ITEMS_FIELD_ID]),
    createdAtMs: parseCreatedAtMs(record.createdAt)
  }
}

/** Every income/expense record (archives included) from the local mirror. */
export async function loadRecordInputs(settings: AppSettings): Promise<RecordInput[]> {
  const forms = settings.forms.filter(form => form.type === 'income' || form.type === 'expense')

  const lists = await Promise.all(
    forms.map(async form => {
      const records = await fetchRecords(settings.spreadsheetId, form).catch(() => [])

      return records.map(record => toRecordInput(form, record))
    })
  )

  return lists.flat()
}
