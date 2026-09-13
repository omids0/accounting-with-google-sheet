import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import type { VehicleCompleteFormState } from './types'
import { calculateNextKm } from './utils'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'
import AmountInput from '../AmountInput'
import { FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'

type VehicleCompleteModalProps = {
  open: boolean
  serviceType: string
  defaultMileage: number
  initialValues?: Partial<VehicleCompleteFormState>
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleCompleteFormState) => void | Promise<void>
}

function buildDefaults(
  defaultMileage: number,
  initialValues?: Partial<VehicleCompleteFormState>
): VehicleCompleteFormState {
  return {
    mileage: initialValues?.mileage ?? String(defaultMileage),
    intervalKm: initialValues?.intervalKm ?? '',
    brand: initialValues?.brand ?? '',
    location: initialValues?.location ?? '',
    amount: initialValues?.amount ?? '',
    notes: initialValues?.notes ?? '',
    date: initialValues?.date ?? getTodayIso()
  }
}

export default function VehicleCompleteModal({
  open,
  serviceType,
  defaultMileage,
  initialValues,
  saving,
  onClose,
  onSubmit
}: VehicleCompleteModalProps) {
  const defaults = useMemo(
    () => buildDefaults(defaultMileage, initialValues),
    [defaultMileage, initialValues]
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<VehicleCompleteFormState>({
    defaultValues: defaults,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, defaults, {
    active: open,
    resetKey: serviceType
  })

  const mileage = parseNumeric(watch('mileage'))
  const intervalKm = parseNumeric(watch('intervalKm'))
  const nextKmPreview = mileage > 0 && intervalKm > 0 ? calculateNextKm(mileage, intervalKm) : null

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title={`ثبت انجام: ${serviceType}`}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel="ثبت انجام سرویس"
    >
      <FormRow>
        <FormField label="کارکرد (km)" required error={formFieldError(errors, 'mileage')}>
          <input
            type="text"
            inputMode="numeric"
            {...register('mileage', requiredField('کارکرد'))}
          />
        </FormField>

        <FormField label="فاصله (km)" required error={formFieldError(errors, 'intervalKm')}>
          <input
            type="text"
            inputMode="numeric"
            {...register('intervalKm', requiredField('فاصله'))}
          />
        </FormField>
      </FormRow>

      {nextKmPreview != null ? (
        <p className="text-[0.82rem] text-muted">
          km بعدی: <strong>{nextKmPreview.toLocaleString('fa-IR')}</strong>
        </p>
      ) : null}

      <FormRow>
        <FormField label="برند">
          <input type="text" {...register('brand')} />
        </FormField>

        <FormField label="محل">
          <input type="text" {...register('location')} />
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="مبلغ (اختیاری)">
          <AmountInput value={watch('amount')} onChange={value => setValue('amount', value)} />
        </FormField>

        <FormField label="تاریخ">
          <JalaliDatePicker value={watch('date')} onChange={date => setValue('date', date)} />
        </FormField>
      </FormRow>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('notes')} rows={2} />
      </FormField>
    </FormModal>
  )
}
