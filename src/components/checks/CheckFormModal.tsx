import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type { CheckFormState, CheckWithRow } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { CHECK_EXPENSE_CATEGORY } from '../../services/checks'
import {
  requiredDate,
  requiredField,
  requiredPositiveAmount,
  submitValidatedForm
} from '../../utils/formValidation'
import { digitsOnly } from '../../utils/idValidators'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import AttachmentField from '../attachments/AttachmentField'
import type { AttachmentDraftsState } from '../attachments/useAttachmentDrafts'
import type { CounterpartyWithRow } from '../counterparties/types'
import { CounterpartySelect, FormField, FormRow, PaymentSubCategoryField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'

const CHECK_NUMBER_DIGITS_ONLY = 'شماره چک فقط عدد است'

export type CheckFormModalProps = {
  open: boolean
  editingItem: CheckWithRow | null
  saving: boolean
  counterparties: CounterpartyWithRow[]
  onClose: () => void
  onSubmit: (values: CheckFormState) => void | Promise<void>
  onCounterpartiesChange: (counterparties: CounterpartyWithRow[]) => void
  /** «پیوست»: a photo of the check. */
  attachments?: AttachmentDraftsState
}

export default function CheckFormModal({
  open,
  editingItem,
  saving,
  counterparties,
  onClose,
  onSubmit,
  onCounterpartiesChange,
  attachments
}: CheckFormModalProps) {
  const initialValues = useMemo<CheckFormState>(
    () =>
      editingItem
        ? {
            checkNumber: editingItem.checkNumber,
            counterparty: editingItem.counterparty,
            subCategory: editingItem.subCategory ?? '',
            amount: editingItem.amount,
            creationDate: editingItem.creationDate,
            dueDate: editingItem.dueDate
          }
        : {
            checkNumber: '',
            counterparty: '',
            subCategory: '',
            amount: '',
            creationDate: getTodayIso(),
            dueDate: getTodayIso()
          },
    [editingItem]
  )

  const { control, handleSubmit, reset } = useForm<CheckFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  // The last key dropped a non-digit: say so instead of silently eating it.
  const [droppedChars, setDroppedChars] = useState(false)

  useEffect(() => setDroppedChars(false), [open, editingItem])

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      variant="panel"
      open={open}
      title={editingItem ? 'ویرایش چک' : 'ثبت چک جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره چک'}
    >
      <FormRow>
        <Controller
          name="checkNumber"
          control={control}
          rules={{
            validate: value => {
              const required = requiredField('شماره چک').validate(value)

              if (required !== true) return required

              // A number saved before this rule stays valid until the user changes it.
              return (
                value === initialValues.checkNumber ||
                /^\d+$/.test(value) ||
                CHECK_NUMBER_DIGITS_ONLY
              )
            }
          }}
          render={({ field, fieldState }) => (
            <FormField
              label="شماره چک"
              required
              error={
                fieldState.error?.message ?? (droppedChars ? CHECK_NUMBER_DIGITS_ONLY : undefined)
              }
            >
              <input
                type="text"
                inputMode="numeric"
                value={field.value}
                onBlur={field.onBlur}
                onChange={event => {
                  const { value, changed } = digitsOnly(event.target.value)

                  setDroppedChars(changed)
                  field.onChange(value)
                }}
                placeholder="شماره چک"
                dir="ltr"
              />
            </FormField>
          )}
        />

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

      <Controller
        name="subCategory"
        control={control}
        render={({ field }) => (
          <PaymentSubCategoryField
            value={field.value}
            onChange={field.onChange}
            categoryType="expense"
            category={CHECK_EXPENSE_CATEGORY}
            ariaLabel="زیردسته چک"
          />
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

      {attachments ? <AttachmentField state={attachments} disabled={saving} /> : null}
    </FormModal>
  )
}
