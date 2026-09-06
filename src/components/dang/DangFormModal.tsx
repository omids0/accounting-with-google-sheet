import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type { DangFormState, DangWithRow } from './types'
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

export type DangFormModalProps = {
  open: boolean
  editingItem: DangWithRow | null
  saving: boolean
  categories: string[]
  counterparties: CounterpartyWithRow[]
  onClose: () => void
  onSubmit: (values: DangFormState) => void | Promise<void>
  onCategoriesChange: (categories: string[]) => void
  onCounterpartiesChange: (counterparties: CounterpartyWithRow[]) => void
}

export default function DangFormModal({
  open,
  editingItem,
  saving,
  categories,
  counterparties,
  onClose,
  onSubmit,
  onCategoriesChange,
  onCounterpartiesChange
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

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<DangFormState>({
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
      title={editingItem ? 'ویرایش بدهی' : 'ثبت بدهی جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره بدهی'}
    >
      <FormField label="عنوان" required controlWidth="full" error={formFieldError(errors, 'title')}>
        <input
          type="text"
          {...register('title', requiredField('عنوان'))}
          placeholder="مثلاً: خرید از فروشگاه"
        />
      </FormField>

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
              categoryScope="dang"
              onCategoriesChange={next => {
                onCategoriesChange(next)
                if (!next.includes(category)) {
                  setValue('category', next[0] ?? '', { shouldValidate: true })
                }
              }}
              aria-label="دسته‌بندی بدهی"
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      <Controller
        name="counterparty"
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
              aria-label="طرف حساب بدهی"
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
          name="date"
          control={control}
          rules={requiredDate('تاریخ')}
          render={({ field, fieldState }) => (
            <FormField label="تاریخ" required error={fieldState.error?.message}>
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
