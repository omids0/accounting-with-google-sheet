import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type { ReceivableFormState, ReceivableWithRow } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import {
  formFieldError,
  requiredDate,
  requiredField,
  requiredPositiveAmount,
  submitValidatedForm
} from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import type { CounterpartyWithRow } from '../counterparties/types'
import { CategorySelect, CounterpartySelect, FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'

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

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ReceivableFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const category = watch('category')

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
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
      <FormField label="عنوان" required controlWidth="full" error={formFieldError(errors, 'title')}>
        <input
          type="text"
          {...register('title', requiredField('عنوان'))}
          placeholder="مثلاً: قرض خرید ماشین"
        />
      </FormField>

      <Controller
        name="debtor"
        control={control}
        rules={requiredField('طرف حساب')}
        render={({ field, fieldState }) => (
          <FormField
            label="طرف حساب"
            required
            controlWidth="full"
            error={fieldState.error?.message}
          >
            <CounterpartySelect
              value={field.value}
              onChange={field.onChange}
              counterparties={counterparties}
              onCounterpartiesChange={onCounterpartiesChange}
              aria-label="طرف حساب طلب"
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      <Controller
        name="category"
        control={control}
        rules={requiredField('دسته‌بندی')}
        render={({ field, fieldState }) => (
          <FormField
            label="دسته‌بندی"
            required
            controlWidth="full"
            error={fieldState.error?.message}
          >
            <CategorySelect
              value={field.value}
              onChange={value => {
                field.onChange(value)
                setValue('category', value, { shouldValidate: true })
              }}
              categories={categories}
              categoryScope="receivable"
              onCategoriesChange={next => {
                setCategories(next)
                if (!next.includes(category)) {
                  setValue('category', next[0] ?? '', { shouldValidate: true })
                }
              }}
              aria-label="دسته‌بندی طلب"
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      <FormRow>
        <Controller
          name="amount"
          control={control}
          rules={requiredPositiveAmount()}
          render={({ field, fieldState }) => (
            <FormField label="مبلغ" required error={fieldState.error?.message}>
              <AmountInput
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Controller
          name="borrowDate"
          control={control}
          rules={requiredDate('تاریخ قرض')}
          render={({ field, fieldState }) => (
            <FormField label="تاریخ قرض گرفتن" required error={fieldState.error?.message}>
              <JalaliDatePicker
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />
      </FormRow>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
