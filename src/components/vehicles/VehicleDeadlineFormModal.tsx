import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { VEHICLE_DEADLINE_CATEGORIES } from './constants'
import type { VehicleDeadlineFormState } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, submitValidatedForm } from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'

type VehicleDeadlineFormModalProps = {
  open: boolean
  title: string
  initialValues?: Partial<VehicleDeadlineFormState>
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleDeadlineFormState) => void | Promise<void>
}

function buildDefaults(
  initialValues?: Partial<VehicleDeadlineFormState>
): VehicleDeadlineFormState {
  const today = getTodayIso()

  return {
    category: initialValues?.category ?? VEHICLE_DEADLINE_CATEGORIES[0],
    startDate: initialValues?.startDate ?? today,
    endDate: initialValues?.endDate ?? today,
    amount: initialValues?.amount ?? '',
    notes: initialValues?.notes ?? ''
  }
}

export default function VehicleDeadlineFormModal({
  open,
  title,
  initialValues,
  saving,
  onClose,
  onSubmit
}: VehicleDeadlineFormModalProps) {
  const formResetKey = JSON.stringify(initialValues ?? 'create')

  const defaults = useMemo(() => buildDefaults(initialValues), [formResetKey])

  const {
    register,
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
      <FormSelect
        label="دسته"
        required
        controlWidth="full"
        value={watch('category')}
        onChange={value => setValue('category', value)}
        options={VEHICLE_DEADLINE_CATEGORIES.map(category => ({
          value: category,
          label: category
        }))}
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

      <FormField label="مبلغ (اختیاری)">
        <AmountInput value={watch('amount')} onChange={value => setValue('amount', value)} />
      </FormField>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('notes')} rows={2} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
