import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type { VehicleDeadlineFormState } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { CategorySelect, FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import { DAYS_BEFORE_OPTIONS } from '../reminders/reminderConstants'

type VehicleDeadlineFormModalProps = {
  open: boolean
  title: string
  categories: string[]
  initialValues?: Partial<VehicleDeadlineFormState>
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleDeadlineFormState) => void | Promise<void>
  onCategoriesChange: (categories: string[]) => void
}

function buildDefaults(
  categories: string[],
  initialValues?: Partial<VehicleDeadlineFormState>
): VehicleDeadlineFormState {
  const today = getTodayIso()

  return {
    category: initialValues?.category ?? categories[0] ?? '',
    startDate: initialValues?.startDate ?? today,
    endDate: initialValues?.endDate ?? today,
    amount: initialValues?.amount ?? '',
    notes: initialValues?.notes ?? '',
    reminderEnabled: initialValues?.reminderEnabled ?? false,
    daysBefore: initialValues?.daysBefore ?? 3
  }
}

export default function VehicleDeadlineFormModal({
  open,
  title,
  categories,
  initialValues,
  saving,
  onClose,
  onSubmit,
  onCategoriesChange
}: VehicleDeadlineFormModalProps) {
  const formResetKey = JSON.stringify(initialValues ?? 'create')

  const defaults = useMemo(
    () => buildDefaults(categories, initialValues),
    [categories, formResetKey]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<VehicleDeadlineFormState>({
    defaultValues: defaults,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, defaults, {
    active: open,
    resetKey: formResetKey
  })

  const category = watch('category')

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel="ذخیره موعد"
    >
      <Controller
        name="category"
        control={control}
        rules={requiredField('دسته')}
        render={({ field, fieldState }) => (
          <FormField label="دسته" required controlWidth="full" error={fieldState.error?.message}>
            <CategorySelect
              value={field.value}
              onChange={value => {
                field.onChange(value)
                setValue('category', value, { shouldValidate: true })
              }}
              categories={categories}
              categoryScope="vehicleDeadline"
              onCategoriesChange={next => {
                onCategoriesChange(next)
                if (!next.includes(category)) {
                  setValue('category', next[0] ?? '', { shouldValidate: true })
                }
              }}
              aria-label="دسته موعد"
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      <FormRow>
        <FormField label="تاریخ شروع" required error={formFieldError(errors, 'startDate')}>
          <JalaliDatePicker
            value={watch('startDate')}
            onChange={date => setValue('startDate', date, { shouldValidate: true })}
          />
        </FormField>

        <FormField label="تاریخ پایان / انقضا" required error={formFieldError(errors, 'endDate')}>
          <JalaliDatePicker
            value={watch('endDate')}
            onChange={date => setValue('endDate', date, { shouldValidate: true })}
          />
        </FormField>
      </FormRow>

      <FormField label="مبلغ (اختیاری)" hint="فقط برای یادداشت؛ در هزینه‌ها ثبت نمی‌شود">
        <AmountInput value={watch('amount')} onChange={value => setValue('amount', value)} />
      </FormField>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('notes')} rows={2} placeholder="توضیحات اختیاری" />
      </FormField>

      <label className="checkbox-row flex items-center gap-2">
        <input type="checkbox" {...register('reminderEnabled')} />
        <span>یادآوری موعد</span>
      </label>

      {watch('reminderEnabled') ? (
        <FormSelect
          label="چند روز قبل یادآوری شود؟"
          controlWidth="full"
          value={String(watch('daysBefore'))}
          onChange={value => setValue('daysBefore', Number(value))}
          options={DAYS_BEFORE_OPTIONS}
        />
      ) : null}
    </FormModal>
  )
}
