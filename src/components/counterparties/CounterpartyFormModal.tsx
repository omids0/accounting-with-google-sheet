import { lazy, Suspense, useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { getActiveWorkspaceType } from '../../services/workspace'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import FormField from '../form/FormField'
import FormRow from '../form/FormRow'
import ToggleSwitch from '../form/ToggleSwitch'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import CounterpartyAccountsField from './CounterpartyAccountsField'
import CounterpartyPhonesField from './CounterpartyPhonesField'
import type {
  CounterpartyAccountFormState,
  CounterpartyFormState,
  CounterpartyPhoneFormState,
  CounterpartyWithRow
} from './types'
import { Skeleton } from '../skeleton/Skeleton'

// Leaflet + its CSS are large; load them only when this modal actually shows the map.
const LocationMapPicker = lazy(() => import('../location/LocationMapPicker'))

type CounterpartyFormModalProps = {
  open: boolean
  editingItem: CounterpartyWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: CounterpartyFormState) => void | Promise<void>
}

const EMPTY_PHONE: CounterpartyPhoneFormState = { number: '' }
const EMPTY_ACCOUNT: CounterpartyAccountFormState = { bankName: '', accountNumber: '' }

function buildInitialValues(editingItem: CounterpartyWithRow | null): CounterpartyFormState {
  // Only a building has the «من» flag; a personal list never gets the field.
  const me = getActiveWorkspaceType() === 'building' ? { me: editingItem?.me ?? false } : {}

  if (editingItem) {
    return {
      firstName: editingItem.firstName,
      lastName: editingItem.lastName,
      birthDate: editingItem.birthDate,
      address: editingItem.address,
      location: editingItem.location,
      phones: editingItem.phones.length > 0 ? editingItem.phones : [{ ...EMPTY_PHONE }],
      accounts: editingItem.accounts.length > 0 ? editingItem.accounts : [{ ...EMPTY_ACCOUNT }],
      note: editingItem.note,
      ...me
    }
  }

  return {
    firstName: '',
    lastName: '',
    birthDate: '',
    address: '',
    location: null,
    phones: [{ ...EMPTY_PHONE }],
    accounts: [{ ...EMPTY_ACCOUNT }],
    note: '',
    ...me
  }
}

export default function CounterpartyFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: CounterpartyFormModalProps) {
  const initialValues = useMemo(() => buildInitialValues(editingItem), [editingItem])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CounterpartyFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      variant="panel"
      open={open}
      title={editingItem ? 'ویرایش طرف حساب' : 'ثبت طرف حساب جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره طرف حساب'}
      size="wide"
    >
      <FormRow>
        <FormField label="نام" required error={formFieldError(errors, 'firstName')}>
          <input type="text" {...register('firstName', requiredField('نام'))} placeholder="نام" />
        </FormField>

        <FormField label="نام خانوادگی" required error={formFieldError(errors, 'lastName')}>
          <input
            type="text"
            {...register('lastName', requiredField('نام خانوادگی'))}
            placeholder="نام خانوادگی"
          />
        </FormField>
      </FormRow>

      <FormField label="تاریخ تولد">
        <JalaliDatePicker
          value={watch('birthDate')}
          onChange={date => setValue('birthDate', date)}
        />
      </FormField>

      <FormField label="لوکیشن" controlWidth="full">
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <Suspense fallback={<Skeleton variant="rect" width="100%" height="17.5rem" />}>
              <LocationMapPicker
                active={open}
                value={field.value}
                onChange={field.onChange}
                onAddressResolved={address => setValue('address', address, { shouldDirty: true })}
              />
            </Suspense>
          )}
        />
      </FormField>

      <FormField
        label="آدرس"
        hint="با انتخاب روی نقشه به‌صورت خودکار تکمیل می‌شود"
        controlWidth="full"
      >
        <textarea {...register('address')} placeholder="آدرس" rows={2} />
      </FormField>

      <CounterpartyPhonesField control={control} register={register} />
      <CounterpartyAccountsField control={control} register={register} />

      {initialValues.me === undefined ? null : (
        <FormField
          label="من"
          hint="خودِ مدیر ساختمان است؛ بدهی ساختمان به او «به مدیر» حساب می‌شود."
        >
          <Controller
            control={control}
            name="me"
            render={({ field }) => (
              <ToggleSwitch checked={!!field.value} onChange={field.onChange} label="من" />
            )}
          />
        </FormField>
      )}

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" rows={2} />
      </FormField>
    </FormModal>
  )
}
