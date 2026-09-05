import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { CategorySelect, FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { ReceivableFormState, ReceivableWithRow } from './types'

type ReceivableFormModalProps = {
  open: boolean
  editingItem: ReceivableWithRow | null
  categories: string[]
  setCategories: React.Dispatch<React.SetStateAction<string[]>>
  saving: boolean
  onClose: () => void
  onSubmit: (values: ReceivableFormState) => void | Promise<void>
}

export default function ReceivableFormModal({
  open,
  editingItem,
  categories,
  setCategories,
  saving,
  onClose,
  onSubmit
}: ReceivableFormModalProps) {
  const initialValues = useMemo<ReceivableFormState>(
    () =>
      editingItem
        ? {
            debtor: editingItem.debtor,
            category: editingItem.category,
            amount: editingItem.amount,
            borrowDate: editingItem.borrowDate,
            note: editingItem.note
          }
        : {
            debtor: '',
            category: categories[0] ?? '',
            amount: '',
            borrowDate: getTodayIso(),
            note: ''
          },
    [editingItem, categories]
  )

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش طلب' : 'ثبت طلب جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره طلب'}
    >
      <FormField label="نام شخص یا ارگان" required>
        <input
          type="text"
          value={form.values.debtor}
          onChange={e => form.setField('debtor', e.target.value)}
          placeholder="مثلاً: علی محمدی"
        />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={form.values.category}
          onChange={category => form.setField('category', category)}
          categories={categories}
          categoryScope="receivable"
          onCategoriesChange={next => {
            setCategories(next)
            if (!next.includes(form.values.category)) {
              form.setField('category', next[0] ?? '')
            }
          }}
          aria-label="دسته‌بندی طلب"
        />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput value={form.values.amount} onChange={val => form.setField('amount', val)} />
      </FormField>

      <FormField label="تاریخ قرض گرفتن" required>
        <JalaliDatePicker
          value={form.values.borrowDate}
          onChange={iso => form.setField('borrowDate', iso)}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={form.values.note}
          onChange={e => form.setField('note', e.target.value)}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
