import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type { VehiclePeriodicFormState } from './types'
import { calculateNextKm } from './utils'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'
import AmountInput from '../AmountInput'
import { CategorySelect, FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import MileageInput from './MileageInput'

type VehiclePeriodicFormModalProps = {
  open: boolean
  title: string
  defaultMileage: number
  serviceTypes: string[]
  initialValues?: Partial<VehiclePeriodicFormState>
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehiclePeriodicFormState) => void | Promise<void>
  onServiceTypesChange: (serviceTypes: string[]) => void
}

function buildDefaults(
  defaultMileage: number,
  serviceTypes: string[],
  initialValues?: Partial<VehiclePeriodicFormState>
): VehiclePeriodicFormState {
  const mileage = initialValues?.mileage ?? String(defaultMileage)

  return {
    serviceType: initialValues?.serviceType ?? serviceTypes[0] ?? '',
    mileage,
    intervalKm: initialValues?.intervalKm ?? '',
    brand: initialValues?.brand ?? '',
    location: initialValues?.location ?? '',
    amount: initialValues?.amount ?? '',
    notes: initialValues?.notes ?? '',
    date: initialValues?.date ?? getTodayIso(),
    isHistorical:
      initialValues?.isHistorical ??
      (initialValues?.mileage != null && parseNumeric(mileage) < defaultMileage)
  }
}

export default function VehiclePeriodicFormModal({
  open,
  title,
  defaultMileage,
  serviceTypes,
  initialValues,
  saving,
  onClose,
  onSubmit,
  onServiceTypesChange
}: VehiclePeriodicFormModalProps) {
  const defaults = useMemo(
    () => buildDefaults(defaultMileage, serviceTypes, initialValues),
    [defaultMileage, initialValues, serviceTypes]
  )

  const {
    register,
    control,
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

  const serviceType = watch('serviceType')
  const mileage = parseNumeric(watch('mileage'))
  const intervalKm = parseNumeric(watch('intervalKm'))
  const isHistorical = watch('isHistorical')
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
      <Controller
        name="serviceType"
        control={control}
        rules={requiredField('نوع سرویس')}
        render={({ field, fieldState }) => (
          <FormField
            label="نوع سرویس"
            required
            controlWidth="full"
            error={fieldState.error?.message}
          >
            <CategorySelect
              value={field.value}
              onChange={value => {
                field.onChange(value)
                setValue('serviceType', value, { shouldValidate: true })
              }}
              categories={serviceTypes}
              categoryScope="vehiclePeriodic"
              onCategoriesChange={next => {
                onServiceTypesChange(next)
                if (!next.includes(serviceType)) {
                  setValue('serviceType', next[0] ?? '', { shouldValidate: true })
                }
              }}
              aria-label="نوع سرویس"
              placeholder="انتخاب نوع سرویس"
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
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

      <label className="flex cursor-pointer items-start gap-2 text-[0.85rem] text-primary">
        <input type="checkbox" className="mt-1" {...register('isHistorical')} />
        <span>
          ثبت سابقه
          <span className="mt-0.5 block text-[0.78rem] font-normal text-muted">
            برای وارد کردن سرویس‌های قبلی؛ کارکرد فعلی خودرو (
            {defaultMileage.toLocaleString('fa-IR')} km) تغییر نمی‌کند.
          </span>
        </span>
      </label>

      {isHistorical ? (
        <p className="text-[0.78rem] text-muted">
          در حالت ثبت سابقه می‌توانید کارکرد کمتر از کارکرد فعلی وارد کنید.
        </p>
      ) : null}

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

        <FormField label="تاریخ اقدام">
          <JalaliDatePicker value={watch('date')} onChange={date => setValue('date', date)} />
        </FormField>
      </FormRow>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('notes')} rows={2} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
