import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
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

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingAccount?.id ?? 'create'
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values)
  }

  return (
    <FormModal
      open={open}
      title={editingAccount ? 'ویرایش حساب' : 'حساب جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingAccount ? 'ذخیره تغییرات' : 'ذخیره حساب'}
    >
      <FormField label="عنوان" required>
        <input
          value={form.values.title}
          onChange={e => form.setField('title', e.target.value)}
          placeholder="مثلاً: بانک ملت، نقدی، ..."
        />
      </FormField>

      <FormField label="موجودی" required>
        <AmountInput value={form.values.balance} onChange={val => form.setField('balance', val)} />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={form.values.note}
          onChange={e => form.setField('note', e.target.value)}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
