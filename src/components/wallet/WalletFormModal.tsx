import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import type { WalletAccountWithRow, WalletFormState } from './types'

type WalletFormModalProps = {
  open: boolean
  editingAccount: WalletAccountWithRow | null
  form: WalletFormState
  setForm: React.Dispatch<React.SetStateAction<WalletFormState>>
  saving: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export default function WalletFormModal({
  open,
  editingAccount,
  form,
  setForm,
  saving,
  onClose,
  onSubmit
}: WalletFormModalProps) {
  return (
    <FormModal
      open={open}
      title={editingAccount ? 'ویرایش حساب' : 'حساب جدید'}
      onClose={onClose}
      onSubmit={onSubmit}
      saving={saving}
      saveLabel={editingAccount ? 'ذخیره تغییرات' : 'ذخیره حساب'}
    >
      <FormField label="عنوان" required>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="مثلاً: بانک ملت، نقدی، ..."
        />
      </FormField>

      <FormField label="موجودی" required>
        <AmountInput
          value={form.balance}
          onChange={val => setForm(f => ({ ...f, balance: val }))}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
