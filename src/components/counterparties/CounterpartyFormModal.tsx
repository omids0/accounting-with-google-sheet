import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { FormField } from '../form'
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
import LocationMapPicker from '../location/LocationMapPicker'

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
  if (editingItem) {
    return {
      firstName: editingItem.firstName,
      lastName: editingItem.lastName,
      birthDate: editingItem.birthDate,
      address: editingItem.address,
      location: editingItem.location,
      phones: editingItem.phones.length > 0 ? editingItem.phones : [{ ...EMPTY_PHONE }],
      accounts: editingItem.accounts.length > 0 ? editingItem.accounts : [{ ...EMPTY_ACCOUNT }]
    }
  }

  return {
    firstName: '',
    lastName: '',
    birthDate: '',
    address: '',
    location: null,
    phones: [{ ...EMPTY_PHONE }],
    accounts: [{ ...EMPTY_ACCOUNT }]
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

  const { register, control, handleSubmit, reset, setValue, watch } =
    useForm<CounterpartyFormState>({
      defaultValues: initialValues
    })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values))(event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش طرف حساب' : 'ثبت طرف حساب جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره طرف حساب'}
    >
      <FormField label="نام" required>
        <input type="text" {...register('firstName')} placeholder="نام" required />
      </FormField>

      <FormField label="نام خانوادگی" required>
        <input type="text" {...register('lastName')} placeholder="نام خانوادگی" required />
      </FormField>

      <FormField label="تاریخ تولد">
        <JalaliDatePicker
          value={watch('birthDate')}
          onChange={date => setValue('birthDate', date)}
        />
      </FormField>

      <FormField label="آدرس">
        <textarea {...register('address')} placeholder="آدرس" rows={2} />
      </FormField>

      <FormField label="لوکیشن">
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <LocationMapPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </FormField>

      <CounterpartyPhonesField control={control} register={register} />
      <CounterpartyAccountsField control={control} register={register} />
    </FormModal>
  )
}
