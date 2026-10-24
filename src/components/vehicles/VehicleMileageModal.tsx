import { useMemo, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import type { VehicleMileageFormState } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, submitValidatedForm } from '../../utils/formValidation'
import { parseNumeric } from '../../utils/parseNumeric'
import ConfirmActionModal from '../ConfirmActionModal'
import { FormField } from '../form'
import FormModal from '../FormModal'
import MileageInput from './MileageInput'
import { isLargeMileageDrop, largeMileageDropMessage } from './utils'

type VehicleMileageModalProps = {
  open: boolean
  vehicleTitle: string
  currentMileage: number
  saving: boolean
  onClose: () => void
  onSubmit: (values: VehicleMileageFormState) => void | Promise<void>
}

export default function VehicleMileageModal({
  open,
  vehicleTitle,
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

  // A typo like «۱۰۰» for «۱۴۰۲۲۰» is saved as a correction, so a big fall asks first.
  const [pendingDrop, setPendingDrop] = useState<VehicleMileageFormState | null>(null)

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    return submitValidatedForm(
      handleSubmit,
      values => {
        if (isLargeMileageDrop(currentMileage, parseNumeric(values.mileage))) {
          setPendingDrop(values)

          return
        }

        return onSubmit(values)
      },
      event
    )
  }

  return (
    <>
      <FormModal
        open={open}
        title={`بروزرسانی کارکرد خودرو ${vehicleTitle}`}
        onClose={onClose}
        onSubmit={onFormSubmit}
        saving={saving}
        saveLabel="ذخیره کارکرد"
      >
        <FormField
          label="کارکرد فعلی (کیلومتر)"
          required
          hint={`کارکرد قبلی: ${currentMileage.toLocaleString(
            'fa-IR'
          )} کیلومتر. اگر قبلاً اشتباه ثبت شده، عدد درست (حتی کمتر) را بزن؛ به‌عنوان اصلاح ثبت می‌شود.`}
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

      <ConfirmActionModal
        open={pendingDrop !== null}
        title="کارکرد کمتر از قبل"
        message={
          pendingDrop
            ? largeMileageDropMessage(currentMileage, parseNumeric(pendingDrop.mileage))
            : ''
        }
        confirmLabel="ثبت همین عدد"
        cancelLabel="اصلاح عدد"
        onClose={() => setPendingDrop(null)}
        onConfirm={() => {
          const values = pendingDrop

          setPendingDrop(null)
          if (values) void onSubmit(values)
        }}
      />
    </>
  )
}
