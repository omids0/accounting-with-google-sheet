import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
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

  const { register, handleSubmit, reset, setValue, watch } = useForm<DangFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const category = watch('category')

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values))(event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش بدهی' : 'ثبت بدهی جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره بدهی'}
    >
      <FormField label="عنوان" required>
        <input type="text" {...register('title')} placeholder="مثلاً: خرید از فروشگاه" />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={category}
          onChange={value => setValue('category', value)}
          categories={categories}
          categoryScope="dang"
          onCategoriesChange={next => {
            onCategoriesChange(next)
            if (!next.includes(category)) {
              setValue('category', next[0] ?? '')
            }
          }}
          aria-label="دسته‌بندی بدهی"
        />
      </FormField>

      <FormField label="طرف حساب" required>
        <input type="text" {...register('counterparty')} placeholder="نام شخص یا گروه" />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput value={watch('amount')} onChange={val => setValue('amount', val)} />
      </FormField>

      <FormField label="تاریخ" required>
        <JalaliDatePicker value={watch('date')} onChange={date => setValue('date', date)} />
      </FormField>

      <FormField label="توضیحات">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
