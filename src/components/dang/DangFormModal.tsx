import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { CategorySelect, FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { DangFormState, DangWithRow } from './types'

export type DangFormModalProps = {
  open: boolean
  editingItem: DangWithRow | null
  saving: boolean
  categories: string[]
  onClose: () => void
  onSubmit: (values: DangFormState) => void | Promise<void>
  onCategoriesChange: (categories: string[]) => void
}

export default function DangFormModal({
  open,
  editingItem,
  saving,
  categories,
  onClose,
  onSubmit,
  onCategoriesChange
}: DangFormModalProps) {
  const initialValues = useMemo<DangFormState>(
    () =>
      editingItem
        ? {
            title: editingItem.title,
            category: editingItem.category,
            counterparty: editingItem.counterparty,
            amount: editingItem.amount,
            date: editingItem.date,
            note: editingItem.note
          }
        : {
            title: '',
            category: categories[0] ?? '',
            counterparty: '',
            amount: '',
            date: getTodayIso(),
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
      title={editingItem ? 'ویرایش بدهی' : 'ثبت بدهی جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره بدهی'}
    >
      <FormField label="عنوان" required>
        <input
          type="text"
          value={form.values.title}
          onChange={e => form.setField('title', e.target.value)}
          placeholder="مثلاً: خرید از فروشگاه"
        />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={form.values.category}
          onChange={category => form.setField('category', category)}
          categories={categories}
          categoryScope="dang"
          onCategoriesChange={next => {
            onCategoriesChange(next)
            if (!next.includes(form.values.category)) {
              form.setField('category', next[0] ?? '')
            }
          }}
          aria-label="دسته‌بندی بدهی"
        />
      </FormField>

      <FormField label="طرف حساب" required>
        <input
          type="text"
          value={form.values.counterparty}
          onChange={e => form.setField('counterparty', e.target.value)}
          placeholder="نام شخص یا گروه"
        />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput value={form.values.amount} onChange={val => form.setField('amount', val)} />
      </FormField>

      <FormField label="تاریخ" required>
        <JalaliDatePicker value={form.values.date} onChange={date => form.setField('date', date)} />
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
