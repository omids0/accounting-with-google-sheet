import type { CustomForm } from '../../types'
import { collatedText, compareCollated } from '../../utils/collatedText'
import { parseNumeric } from '../../utils/parseNumeric'

export interface RecordItem {
  id: string
  createdAt: string
  rowNumber: number
  /** The tab holding the row (form tab or yearly archive); the form tab when unset. */
  sheetName?: string
  values: Record<string, string>
  /** Drive ids of its receipts (column «پیوست»). */
  attachments?: string[]
  /** Email in «ثبت‌کننده»; '' or unset for rows from before round 8. */
  writer?: string
}

export interface StoredRecord extends RecordItem {
  formId: string
  formType: CustomForm['type']
  formName: string
}

export function enrichRecord(record: RecordItem, form: CustomForm): StoredRecord {
  return {
    ...record,
    formId: form.id,
    formType: form.type,
    formName: form.name
  }
}

export function getFormField(form: CustomForm, kind: 'date' | 'amount' | 'title' | 'category') {
  switch (kind) {
    case 'date':
      return form.fields.find(f => f.type === 'date')

    case 'amount':
      return form.fields.find(f => f.id === 'amount')

    case 'category':
      return form.fields.find(f => f.id === 'category')

    case 'title':
      return form.fields.find(f => f.id === 'title' || f.label.includes('عنوان'))
  }
}

/** Newest first: by the form's date field, then by when the row was created. */
export function sortRecords(records: StoredRecord[], forms: CustomForm[]): StoredRecord[] {
  // The date field and the collation keys are worked out once per form/record, not per comparison.
  const dateFieldByForm = new Map<string, string>()

  for (const form of forms) {
    if (!dateFieldByForm.has(form.id)) {
      dateFieldByForm.set(form.id, form.fields.find(field => field.type === 'date')?.id ?? 'date')
    }
  }

  const keyed = records.map(record => ({
    record,
    date: collatedText(record.values[dateFieldByForm.get(record.formId) ?? 'date'] ?? ''),
    created: collatedText(record.createdAt || '')
  }))

  keyed.sort((a, b) => compareCollated(b.date, a.date) || compareCollated(b.created, a.created))

  return keyed.map(item => item.record)
}

export function getCategoryOptions(form: CustomForm | undefined, records: RecordItem[]): string[] {
  const fromForm = form?.fields.find(f => f.id === 'category')?.options ?? []

  const categoryFieldId = form?.fields.find(f => f.id === 'category')?.id ?? 'category'

  const fromRecords = records.map(r => r.values[categoryFieldId] ?? '').filter(Boolean)

  return [...new Set([...fromForm, ...fromRecords])].sort((a, b) => a.localeCompare(b, 'fa'))
}

export interface RecordsAmountTotals {
  income: number
  expense: number
  net: number
}

export function getRecordAmount(record: StoredRecord, forms: CustomForm[]): number {
  const form = forms.find(item => item.id === record.formId)

  if (!form) return 0

  const amountField = getFormField(form, 'amount')

  if (!amountField) return 0

  const amount = parseNumeric(record.values[amountField.id])

  return Number.isFinite(amount) ? amount : 0
}

export function summarizeFilteredRecords(
  records: StoredRecord[],
  forms: CustomForm[]
): RecordsAmountTotals {
  let income = 0
  let expense = 0

  for (const record of records) {
    const form = forms.find(item => item.id === record.formId)

    if (!form) continue

    const amount = getRecordAmount(record, forms)

    if (form.type === 'income') income += amount
    else if (form.type === 'expense') expense += amount
  }

  return { income, expense, net: income - expense }
}

export function sumFilteredRecordAmounts(
  records: StoredRecord[],
  forms: CustomForm[],
  activeForm?: CustomForm
): number {
  return records.reduce((sum, record) => {
    const form = activeForm ?? forms.find(item => item.id === record.formId)

    if (!form) return sum

    const amountField = getFormField(form, 'amount')

    if (!amountField) return sum

    const amount = parseNumeric(record.values[amountField.id])

    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}
