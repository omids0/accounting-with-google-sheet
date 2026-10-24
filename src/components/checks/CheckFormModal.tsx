import { useMemo, type FormEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { CHECK_DIRECTION_OPTIONS, checkCounterpartyLabel } from './checkDirectionOptions'
import type { CheckFormState, CheckWithRow } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { CHECK_EXPENSE_CATEGORY, CHECK_INCOME_CATEGORY } from '../../services/checks'
import {
  formFieldError,
  requiredDate,
  requiredField,
  requiredPositiveAmount,
  submitValidatedForm
} from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import AttachmentField from '../attachments/AttachmentField'
import type { AttachmentDraftsState } from '../attachments/useAttachmentDrafts'
import type { CounterpartyWithRow } from '../counterparties/types'
import {
  CounterpartySelect,
  FormField,
  FormRow,
  PaymentSubCategoryField,
  SegmentedRadio
} from '../form'
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
            direction: editingItem.direction,
            checkNumber: editingItem.checkNumber,
            counterparty: editingItem.counterparty,
            subCategory: editingItem.subCategory ?? '',
            amount: editingItem.amount,
            creationDate: editingItem.creationDate,
            dueDate: editingItem.dueDate
          }
        : {
            direction: 'paid',
            checkNumber: '',
            counterparty: '',
            subCategory: '',
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
    setValue,
    formState: { errors }
  } = useForm<CheckFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  const direction = useWatch({ control, name: 'direction' })
  const received = direction === 'received'
  const counterpartyLabel = checkCounterpartyLabel(direction)
  // The record a passed check made is an expense or an income: its type stays.
  const directionLocked = Boolean(editingItem?.paid)

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

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
      <Controller
        name="direction"
        control={control}
        render={({ field }) => (
          <FormField
            controlWidth="full"
            hint={directionLocked ? 'چک پاس شده است؛ نوعش دیگر قابل تغییر نیست.' : undefined}
          >
            <SegmentedRadio
              label="نوع چک"
              options={CHECK_DIRECTION_OPTIONS}
              value={field.value}
              onChange={value => {
                field.onChange(value)
                // Its subcategories belong to the other record type.
                setValue('subCategory', '')
              }}
              disabled={directionLocked}
              className="[&_button]:min-h-11"
            />
          </FormField>
        )}
      />

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
        rules={requiredField(received ? 'صادرکننده' : 'گیرنده')}
        render={({ field, fieldState }) => (
          <FormField
            label={counterpartyLabel}
            required
            controlWidth="full"
            error={fieldState.error?.message}
          >
            <CounterpartySelect
              value={field.value}
              onChange={field.onChange}
              counterparties={counterparties}
              onCounterpartiesChange={onCounterpartiesChange}
              aria-label={`${counterpartyLabel} چک`}
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
            categoryType={received ? 'income' : 'expense'}
            category={received ? CHECK_INCOME_CATEGORY : CHECK_EXPENSE_CATEGORY}
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
