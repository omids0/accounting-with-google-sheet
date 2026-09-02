import type { CustomForm } from '../../types'

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

  return [...new Set([...fromForm, ...fromRecords])]
}
