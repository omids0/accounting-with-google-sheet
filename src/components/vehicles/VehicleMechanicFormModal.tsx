import { useMemo, type FormEvent } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

import type { VehicleMechanicFormState, VehicleMechanicItemFormState } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { requiredField, submitValidatedForm } from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import AppIcon from '../AppIcon'
import { CategorySelect, FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import MileageInput from './MileageInput'
import Button from '../ui/Button'

type VehicleMechanicFormModalProps = {
  open: boolean
  defaultMileage: number
  mechanicCategories: string[]
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleMechanicFormState) => void | Promise<void>
  onMechanicCategoriesChange: (categories: string[]) => void
}

function buildEmptyItem(categories: string[]): VehicleMechanicItemFormState {
  return {
    category: categories[0] ?? '',
    note: ''
  }
}

function buildDefaults(defaultMileage: number, categories: string[]): VehicleMechanicFormState {
  return {
    date: getTodayIso(),
    mileage: String(defaultMileage),
    location: '',
    totalAmount: '',
    notes: '',
    items: [buildEmptyItem(categories)],
    isHistorical: false
  }
}

export default function VehicleMechanicFormModal({
  open,
  defaultMileage,
  mechanicCategories,
  saving,
  onClose,
  onSubmit,
  onMechanicCategoriesChange
}: VehicleMechanicFormModalProps) {
  const defaults = useMemo(
    () => buildDefaults(defaultMileage, mechanicCategories),
    [defaultMileage, mechanicCategories]
  )

  const { register, control, handleSubmit, reset, setValue, watch } =
    useForm<VehicleMechanicFormState>({
      defaultValues: defaults
    })

  const isHistorical = watch('isHistorical')

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useModalFormReset(reset, defaults, { active: open, resetKey: 'mechanic' })

  const handleCategoriesChange = (next: string[]) => {
    onMechanicCategoriesChange(next)
    fields.forEach((_, index) => {
      const current = watch(`items.${index}.category`)
      if (!next.includes(current)) {
        setValue(`items.${index}.category`, next[0] ?? '', { shouldValidate: true })
      }
    })
  }

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title="مراجعه مکانیک"
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel="ذخیره مراجعه"
      size="wide"
    >
      <FormRow>
        <FormField label="تاریخ">
          <JalaliDatePicker value={watch('date')} onChange={date => setValue('date', date)} />
        </FormField>

        <FormField label="کارکرد (اختیاری)">
          <MileageInput
            value={watch('mileage')}
            onChange={value => setValue('mileage', value === '' ? '' : String(value))}
          />
        </FormField>
      </FormRow>

      <label className="flex cursor-pointer items-start gap-2 text-[0.85rem] text-primary">
        <input type="checkbox" className="mt-1" {...register('isHistorical')} />
        <span>
          ثبت سابقه
          <span className="mt-0.5 block text-[0.78rem] font-normal text-muted">
            برای مراجعات قبلی؛ کارکرد فعلی خودرو ({defaultMileage.toLocaleString('fa-IR')} km) تغییر
            نمی‌کند.
          </span>
        </span>
      </label>

      {isHistorical ? (
        <p className="text-[0.78rem] text-muted">
          در حالت ثبت سابقه می‌توانید کارکرد کمتر از کارکرد فعلی وارد کنید.
        </p>
      ) : null}

      <FormField label="مکان">
        <input type="text" {...register('location')} placeholder="نام تعمیرگاه" />
      </FormField>

      <div className="flex flex-col gap-3">
        <div className="text-[0.85rem] font-bold text-primary">اقلام کار</div>
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-2 rounded-sm border border-border p-3">
            <FormRow>
              <Controller
                name={`items.${index}.category`}
                control={control}
                rules={requiredField('دسته')}
                render={({ field: categoryField, fieldState }) => (
                  <FormField
                    label="دسته"
                    required
                    controlWidth="full"
                    error={fieldState.error?.message}
                  >
                    <CategorySelect
                      value={categoryField.value}
                      onChange={value => {
                        categoryField.onChange(value)
                        setValue(`items.${index}.category`, value, { shouldValidate: true })
                      }}
                      categories={mechanicCategories}
                      categoryScope="vehicleMechanic"
                      onCategoriesChange={handleCategoriesChange}
                      aria-label="دسته"
                      placeholder="انتخاب دسته"
                      invalid={Boolean(fieldState.error)}
                    />
                  </FormField>
                )}
              />
              <FormField label="توضیح">
                <input type="text" {...register(`items.${index}.note`)} placeholder="توضیح کوتاه" />
              </FormField>
            </FormRow>
            {fields.length > 1 ? (
              <Button type="button" variant="danger" size="sm" onClick={() => remove(index)}>
                حذف ردیف
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append(buildEmptyItem(mechanicCategories))}
        >
          <AppIcon name="add" size={16} />
          افزودن ردیف
        </Button>
      </div>

      <FormField label="مبلغ کل (اختیاری)">
        <AmountInput
          value={watch('totalAmount')}
          onChange={value => setValue('totalAmount', value)}
        />
      </FormField>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('notes')} rows={2} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
