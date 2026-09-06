import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import type { CounterpartyWithRow } from '../counterparties/types'
import { CategorySelect, CounterpartySelect, FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { ReceivableFormState, ReceivableWithRow } from './types'

type ReceivableFormModalProps = {
  open: boolean
  editingItem: ReceivableWithRow | null
  categories: string[]
  setCategories: React.Dispatch<React.SetStateAction<string[]>>
  counterparties: CounterpartyWithRow[]
  saving: boolean
  onClose: () => void
  onSubmit: (values: ReceivableFormState) => void | Promise<void>
  onCounterpartiesChange: (counterparties: CounterpartyWithRow[]) => void
}

export default function ReceivableFormModal({
  open,
  editingItem,
  categories,
  setCategories,
  counterparties,
  saving,
  onClose,
  onSubmit,
  onCounterpartiesChange
}: ReceivableFormModalProps) {
  const initialValues = useMemo<ReceivableFormState>(
    () =>
      editingItem
        ? {
            title: editingItem.title,
            debtor: editingItem.debtor,
            category: editingItem.category,
            amount: editingItem.amount,
            borrowDate: editingItem.borrowDate,
            note: editingItem.note
          }
        : {
            title: '',
            debtor: '',
            category: categories[0] ?? '',
            amount: '',
            borrowDate: getTodayIso(),
            note: ''
          },
    [editingItem, categories]
  )

  const { register, handleSubmit, reset, setValue, watch } = useForm<ReceivableFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const category = watch('category')
  const counterparty = watch('debtor')

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values))(event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش طلب' : 'ثبت طلب جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره طلب'}
    >
      <FormField label="عنوان" required>
        <input type="text" {...register('title')} placeholder="مثلاً: قرض خرید ماشین" />
      </FormField>

      <FormField label="طرف حساب" required>
        <CounterpartySelect
          value={counterparty}
          onChange={value => setValue('debtor', value)}
          counterparties={counterparties}
          onCounterpartiesChange={onCounterpartiesChange}
          aria-label="طرف حساب طلب"
        />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={category}
          onChange={value => setValue('category', value)}
          categories={categories}
          categoryScope="receivable"
          onCategoriesChange={next => {
            setCategories(next)
            if (!next.includes(category)) {
              setValue('category', next[0] ?? '')
            }
          }}
          aria-label="دسته‌بندی طلب"
        />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput value={watch('amount')} onChange={val => setValue('amount', val)} />
      </FormField>

      <FormField label="تاریخ قرض گرفتن" required>
        <JalaliDatePicker
          value={watch('borrowDate')}
          onChange={iso => setValue('borrowDate', iso)}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
