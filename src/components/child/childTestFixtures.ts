import type { CustomForm } from '../../types'
import type { StoredRecord } from '../records/recordsUtils'

const fields = [
  { id: 'date', label: 'تاریخ', type: 'date', required: true },
  { id: 'amount', label: 'مبلغ', type: 'number', required: true },
  { id: 'category', label: 'دسته‌بندی', type: 'select', required: false },
  { id: 'title', label: 'عنوان', type: 'text', required: false }
] as const

export const forms: CustomForm[] = [
  { id: 'income', name: 'درآمد', sheetName: 'income', type: 'income', fields: [...fields] },
  { id: 'expense', name: 'هزینه', sheetName: 'expense', type: 'expense', fields: [...fields] }
]

let seq = 0

export function rec(
  formType: 'income' | 'expense',
  values: Record<string, string>,
  formName = formType === 'income' ? 'درآمد' : 'هزینه'
): StoredRecord {
  seq += 1

  return {
    id: 'r' + seq,
    createdAt: '',
    rowNumber: seq + 1,
    values,
    formId: formType,
    formType,
    formName
  }
}
