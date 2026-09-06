import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
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

  const { register, handleSubmit, reset, setValue, watch } = useForm<WalletFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingAccount?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values))(event)
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
      <FormField label="عنوان" required>
        <input {...register('title')} placeholder="مثلاً: بانک ملت، نقدی، ..." />
      </FormField>

      <FormField label="موجودی" required>
        <AmountInput value={watch('balance')} onChange={val => setValue('balance', val)} />
      </FormField>

      <FormField label="توضیحات">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
