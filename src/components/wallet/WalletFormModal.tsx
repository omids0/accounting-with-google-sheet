import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import {
  formFieldError,
  requiredField,
  requiredNonNegativeAmount,
  submitValidatedForm
} from '../../utils/formValidation'
import AmountInput from '../AmountInput'
import { FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import type { WalletAccountWithRow, WalletFormState } from './types'

type WalletFormModalProps = {
  open: boolean
  editingAccount: WalletAccountWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: WalletFormState) => void | Promise<void>
}

export default function WalletFormModal({
  open,
  editingAccount,
  saving,
  onClose,
  onSubmit
}: WalletFormModalProps) {
  const initialValues = useMemo<WalletFormState>(
    () =>
      editingAccount
        ? {
            title: editingAccount.title,
            balance: editingAccount.balance,
            note: editingAccount.note
          }
        : {
            title: '',
            balance: '',
            note: ''
          },
    [editingAccount]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<WalletFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingAccount?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title={editingAccount ? 'ویرایش حساب' : 'حساب جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingAccount ? 'ذخیره تغییرات' : 'ذخیره حساب'}
    >
      <FormRow>
        <FormField label="عنوان" required error={formFieldError(errors, 'title')}>
          <input
            {...register('title', requiredField('عنوان'))}
            placeholder="مثلاً: بانک ملت، نقدی، ..."
          />
        </FormField>

        <Controller
          name="balance"
          control={control}
          rules={requiredNonNegativeAmount('موجودی را وارد کنید')}
          render={({ field, fieldState }) => (
            <FormField label="موجودی" required error={fieldState.error?.message}>
              <AmountInput
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />
      </FormRow>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
