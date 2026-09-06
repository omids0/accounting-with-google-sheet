import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type { CheckFormState, CheckWithRow } from './types'
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
import { CounterpartySelect, FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'

export type CheckFormModalProps = {
  open: boolean
  editingItem: CheckWithRow | null
  saving: boolean
  counterparties: CounterpartyWithRow[]
  onClose: () => void
  onSubmit: (values: CheckFormState) => void | Promise<void>
  onCounterpartiesChange: (counterparties: CounterpartyWithRow[]) => void
}

export default function CheckFormModal({
  open,
  editingItem,
  saving,
  counterparties,
  onClose,
  onSubmit,
  onCounterpartiesChange
}: CheckFormModalProps) {
  const initialValues = useMemo<CheckFormState>(
    () =>
      editingItem
        ? {
            checkNumber: editingItem.checkNumber,
            counterparty: editingItem.counterparty,
            amount: editingItem.amount,
            creationDate: editingItem.creationDate,
            dueDate: editingItem.dueDate
          }
        : {
            checkNumber: '',
            counterparty: '',
            amount: '',
            creationDate: getTodayIso(),
            dueDate: getTodayIso()
          },
    [editingItem]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CheckFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش چک' : 'ثبت چک جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره چک'}
    >
      <FormRow>
        <FormField label="شماره چک" required error={formFieldError(errors, 'checkNumber')}>
          <input
            type="text"
            {...register('checkNumber', requiredField('شماره چک'))}
            placeholder="شماره چک"
            dir="ltr"
          />
        </FormField>

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
      </FormRow>

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
              aria-label="طرف حساب چک"
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      <FormRow>
        <Controller
          name="creationDate"
          control={control}
          rules={requiredDate('تاریخ صدور')}
          render={({ field, fieldState }) => (
            <FormField label="تاریخ صدور" required error={fieldState.error?.message}>
              <JalaliDatePicker
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Controller
          name="dueDate"
          control={control}
          rules={requiredDate('تاریخ سررسید')}
          render={({ field, fieldState }) => (
            <FormField label="تاریخ سررسید" required error={fieldState.error?.message}>
              <JalaliDatePicker
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />
      </FormRow>
    </FormModal>
  )
}
