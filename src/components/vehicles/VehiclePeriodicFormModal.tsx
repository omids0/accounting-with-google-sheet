import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { VEHICLE_PERIODIC_SERVICE_TYPES } from './constants'
import type { VehiclePeriodicFormState } from './types'
import { calculateNextKm } from './utils'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, submitValidatedForm } from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'
import AmountInput from '../AmountInput'
import { FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import MileageInput from './MileageInput'

type VehiclePeriodicFormModalProps = {
  open: boolean
  title: string
  defaultMileage: number
  initialValues?: Partial<VehiclePeriodicFormState>
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehiclePeriodicFormState) => void | Promise<void>
}

function buildDefaults(
  defaultMileage: number,
  initialValues?: Partial<VehiclePeriodicFormState>
): VehiclePeriodicFormState {
  return {
    serviceType: initialValues?.serviceType ?? VEHICLE_PERIODIC_SERVICE_TYPES[0],
    mileage: initialValues?.mileage ?? String(defaultMileage),
    intervalKm: initialValues?.intervalKm ?? '',
    brand: initialValues?.brand ?? '',
    location: initialValues?.location ?? '',
    amount: initialValues?.amount ?? '',
    notes: initialValues?.notes ?? '',
    date: initialValues?.date ?? getTodayIso()
  }
}

export default function VehiclePeriodicFormModal({
  open,
  title,
  defaultMileage,
  initialValues,
  saving,
  onClose,
  onSubmit
}: VehiclePeriodicFormModalProps) {
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
  } = useForm<VehiclePeriodicFormState>({
    defaultValues: defaults,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, defaults, {
    active: open,
    resetKey: JSON.stringify(initialValues ?? 'create')
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
      title={title}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel="ذخیره سرویس"
    >
      <FormSelect
        label="نوع سرویس"
        required
        controlWidth="full"
        value={watch('serviceType')}
        onChange={value => setValue('serviceType', value)}
        options={VEHICLE_PERIODIC_SERVICE_TYPES.map(type => ({ value: type, label: type }))}
      />

      <FormRow>
        <FormField label="کارکرد (km)" required error={formFieldError(errors, 'mileage')}>
          <MileageInput
            value={watch('mileage')}
            onChange={value => setValue('mileage', value === '' ? '' : String(value))}
            invalid={Boolean(errors.mileage)}
          />
        </FormField>

        <FormField label="فاصله (km)" required error={formFieldError(errors, 'intervalKm')}>
          <MileageInput
            value={watch('intervalKm')}
            onChange={value => setValue('intervalKm', value === '' ? '' : String(value))}
            invalid={Boolean(errors.intervalKm)}
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
          <input type="text" {...register('brand')} placeholder="برند قطعه" />
        </FormField>

        <FormField label="محل">
          <input type="text" {...register('location')} placeholder="محل انجام" />
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
        <textarea {...register('notes')} rows={2} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
