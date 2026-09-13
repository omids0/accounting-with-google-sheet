import { useMemo, type FormEvent } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import { VEHICLE_MECHANIC_CATEGORIES } from './constants'
import type { VehicleMechanicFormState, VehicleMechanicItemFormState } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { submitValidatedForm } from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import AppIcon from '../AppIcon'
import { FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import MileageInput from './MileageInput'
import Button from '../ui/Button'

type VehicleMechanicFormModalProps = {
  open: boolean
  defaultMileage: number
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleMechanicFormState) => void | Promise<void>
}

const EMPTY_ITEM: VehicleMechanicItemFormState = {
  category: VEHICLE_MECHANIC_CATEGORIES[0],
  note: ''
}

function buildDefaults(defaultMileage: number): VehicleMechanicFormState {
  return {
    date: getTodayIso(),
    mileage: String(defaultMileage),
    location: '',
    totalAmount: '',
    notes: '',
    items: [{ ...EMPTY_ITEM }]
  }
}

export default function VehicleMechanicFormModal({
  open,
  defaultMileage,
  saving,
  onClose,
  onSubmit
}: VehicleMechanicFormModalProps) {
  const defaults = useMemo(() => buildDefaults(defaultMileage), [defaultMileage])

  const { register, control, handleSubmit, reset, setValue, watch } =
    useForm<VehicleMechanicFormState>({
      defaultValues: defaults
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useModalFormReset(reset, defaults, { active: open, resetKey: 'mechanic' })

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

      <FormField label="مکان">
        <input type="text" {...register('location')} placeholder="نام تعمیرگاه" />
      </FormField>

      <div className="flex flex-col gap-3">
        <div className="text-[0.85rem] font-bold text-primary">اقلام کار</div>
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-2 rounded-sm border border-border p-3">
            <FormRow>
              <FormSelect
                label="دسته"
                controlWidth="full"
                value={watch(`items.${index}.category`)}
                onChange={value => setValue(`items.${index}.category`, value)}
                options={VEHICLE_MECHANIC_CATEGORIES.map(category => ({
                  value: category,
                  label: category
                }))}
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
          onClick={() => append({ ...EMPTY_ITEM })}
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
