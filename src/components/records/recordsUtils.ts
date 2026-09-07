import type { CustomForm } from '../../types'
import { parseNumeric } from '../../utils/parseNumeric'

export interface RecordItem {
  id: string
  createdAt: string
  rowNumber: number
  values: Record<string, string>
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

export function sortRecords(records: StoredRecord[], forms: CustomForm[]): StoredRecord[] {
  const dateFieldFor = (formId: string) =>
    forms.find(f => f.id === formId)?.fields.find(field => field.type === 'date')?.id ?? 'date'

  return [...records].sort((a, b) => {
    const aDate = a.values[dateFieldFor(a.formId)] ?? ''

    const bDate = b.values[dateFieldFor(b.formId)] ?? ''

    const byDate = bDate.localeCompare(aDate)

    if (byDate !== 0) return byDate

    return (b.createdAt || '').localeCompare(a.createdAt || '')
  })
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
