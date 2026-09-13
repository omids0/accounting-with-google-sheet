import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import type { VehicleMileageFormState } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, submitValidatedForm } from '../../utils/formValidation'
import { FormField } from '../form'
import FormModal from '../FormModal'
import MileageInput from './MileageInput'

type VehicleMileageModalProps = {
  open: boolean
  currentMileage: number
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleMileageFormState) => void | Promise<void>
}

export default function VehicleMileageModal({
  open,
  currentMileage,
  saving,
  onClose,
  onSubmit
}: VehicleMileageModalProps) {
  const initialValues = useMemo<VehicleMileageFormState>(
    () => ({ mileage: String(currentMileage) }),
    [currentMileage]
  )

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<VehicleMileageFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, { active: open, resetKey: String(currentMileage) })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title="بروزرسانی کارکرد"
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel="ذخیره کارکرد"
    >
      <FormField
        label="کارکرد فعلی (km)"
        required
        hint={`کارکرد قبلی: ${currentMileage.toLocaleString('fa-IR')} km`}
        controlWidth="full"
        error={formFieldError(errors, 'mileage')}
      >
        <MileageInput
          value={watch('mileage')}
          onChange={value => setValue('mileage', value === '' ? '' : String(value))}
          invalid={Boolean(errors.mileage)}
        />
      </FormField>
    </FormModal>
  )
}
