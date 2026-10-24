import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { VEHICLE_MILEAGE_REMINDER_OPTIONS } from './constants'
import type { VehicleProfileFormState, VehicleProfileWithRow } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { getVehicleExpenseCategories } from '../../services/vehicleExpenseCategories'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import { DEFAULT_MILEAGE_REQUIRED_TYPES } from '../../utils/vehicleExpenseUtils'
import { FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import ToggleChipGroup from '../ToggleChipGroup'
import IranPlateInput from './IranPlateInput'
import MileageInput from './MileageInput'

type VehicleProfileFormModalProps = {
  open: boolean
  editingItem: VehicleProfileWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleProfileFormState) => void | Promise<void>
}

function buildInitialValues(editingItem: VehicleProfileWithRow | null): VehicleProfileFormState {
  if (editingItem) {
    return {
      title: editingItem.title,
      mileage: String(editingItem.mileage),
      vin: editingItem.vin,
      buildYear: editingItem.buildYear,
      capacity: editingItem.capacity,
      plate: editingItem.plate,
      mileageReminderInterval: editingItem.mileageReminderInterval,
      mileageRequiredTypes: editingItem.mileageRequiredTypes
    }
  }

  return {
    title: '',
    mileage: '',
    vin: '',
    buildYear: '',
    capacity: '',
    plate: '',
    mileageReminderInterval: 'first-of-month',
    mileageRequiredTypes: [...DEFAULT_MILEAGE_REQUIRED_TYPES]
  }
}

export default function VehicleProfileFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: VehicleProfileFormModalProps) {
  const initialValues = useMemo(() => buildInitialValues(editingItem), [editingItem])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<VehicleProfileFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    return submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  const requiredTypes = watch('mileageRequiredTypes')
  // Types already required stay listed even if later removed from the category list.
  const expenseTypes = useMemo(
    () => [...new Set([...getVehicleExpenseCategories(), ...requiredTypes])],
    [requiredTypes]
  )

  return (
    <FormModal
      variant="panel"
      open={open}
      title={editingItem ? 'ویرایش خودرو' : 'خودرو جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره خودرو'}
    >
      <FormField
        label="عنوان"
        required
        hint="مثلاً پژو ۲۰۶ سفید"
        controlWidth="full"
        error={formFieldError(errors, 'title')}
      >
        <input
          type="text"
          {...register('title', requiredField('عنوان'))}
          placeholder="عنوان خودرو"
        />
      </FormField>

      <FormField label="کارکرد (km)" required error={formFieldError(errors, 'mileage')}>
        <MileageInput
          value={watch('mileage')}
          onChange={value => setValue('mileage', value === '' ? '' : String(value))}
          invalid={Boolean(errors.mileage)}
        />
      </FormField>

      <FormField label="پلاک" controlWidth="full">
        <IranPlateInput value={watch('plate')} onChange={value => setValue('plate', value)} />
      </FormField>

      <FormRow>
        <FormField label="VIN">
          <input type="text" {...register('vin')} placeholder="شماره VIN" dir="ltr" />
        </FormField>

        <FormField label="سال ساخت">
          <input
            type="text"
            inputMode="numeric"
            {...register('buildYear')}
            placeholder="مثلاً ۱۴۰۰"
          />
        </FormField>
      </FormRow>

      <FormField label="ظرفیت">
        <input type="text" {...register('capacity')} placeholder="مثلاً ۵ نفر" />
      </FormField>

      <FormSelect
        label="یادآوری بروزرسانی کارکرد"
        controlWidth="full"
        value={watch('mileageReminderInterval')}
        onChange={value =>
          setValue(
            'mileageReminderInterval',
            value as VehicleProfileFormState['mileageReminderInterval']
          )
        }
        options={VEHICLE_MILEAGE_REMINDER_OPTIONS.map(option => ({
          value: option.value,
          label: option.label
        }))}
      />

      <FormField
        label="کارکرد اجباری در هزینه‌ها"
        controlWidth="full"
        hint="برای نوع هزینه‌های انتخاب‌شده، ثبت هزینه بدون کارکرد ممکن نیست. برای بقیه، کارکرد اختیاری است."
      >
        <ToggleChipGroup
          ariaLabel="نوع هزینه‌هایی که کارکرد اجباری دارند"
          options={expenseTypes.map(name => ({ id: name, label: name }))}
          selected={Object.fromEntries(requiredTypes.map(name => [name, true]))}
          onToggle={name =>
            setValue(
              'mileageRequiredTypes',
              requiredTypes.includes(name)
                ? requiredTypes.filter(item => item !== name)
                : [...requiredTypes, name]
            )
          }
        />
      </FormField>
    </FormModal>
  )
}
