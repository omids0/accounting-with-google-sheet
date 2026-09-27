import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type {
  DangSplitExpenseFormState,
  DangSplitExpenseWithRow,
  DangSplitPersonWithRow
} from './types'
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
import { FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'

export default function DangSplitExpenseFormModal({
  open,
  editingItem,
  people,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean
  editingItem: DangSplitExpenseWithRow | null
  people: DangSplitPersonWithRow[]
  saving: boolean
  onClose: () => void
  onSubmit: (values: DangSplitExpenseFormState) => void | Promise<void>
}) {
  const initialValues = useMemo<DangSplitExpenseFormState>(
    () =>
      editingItem
        ? {
            title: editingItem.title,
            date: editingItem.date,
            amount: editingItem.amount,
            payerId: editingItem.payerId,
            note: editingItem.note
          }
        : { title: '', date: getTodayIso(), amount: '', payerId: '', note: '' },
    [editingItem]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DangSplitExpenseFormState>({ defaultValues: initialValues, mode: 'onSubmit' })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const payerOptions = useMemo(
    () => [
      { value: '', label: 'ثبت نشده' },
      ...people.map(person => ({ value: person.id, label: person.name }))
    ],
    [people]
  )

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش هزینه' : 'افزودن هزینه'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره هزینه'}
    >
      <FormField
        label="عنوان هزینه"
        required
        controlWidth="full"
        error={formFieldError(errors, 'title')}
      >
        <input
          type="text"
          {...register('title', requiredField('عنوان هزینه'))}
          placeholder="مثلاً: شام"
        />
      </FormField>

      <FormRow>
        <Controller
          name="amount"
          control={control}
          rules={requiredPositiveAmount()}
          render={({ field, fieldState }) => (
            <FormField label="جمع کل هزینه" required error={fieldState.error?.message}>
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
          rules={requiredDate('تاریخ هزینه')}
          render={({ field, fieldState }) => (
            <FormField label="تاریخ هزینه" required error={fieldState.error?.message}>
              <JalaliDatePicker
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />
      </FormRow>

      <Controller
        name="payerId"
        control={control}
        render={({ field }) => (
          <FormSelect
            label="پرداخت‌کننده"
            hint="هر چه این نفر پرداخت کند، از بدهی خودش کم و بقیه به او بدهکار می‌شوند"
            value={field.value}
            onChange={field.onChange}
            options={payerOptions}
            aria-label="پرداخت‌کننده هزینه"
          />
        )}
      />

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
