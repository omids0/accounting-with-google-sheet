import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { CheckFormState, CheckWithRow } from './types'

export type CheckFormModalProps = {
  open: boolean
  editingItem: CheckWithRow | null
  form: CheckFormState
  saving: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFormChange: (updater: (prev: CheckFormState) => CheckFormState) => void
}

export default function CheckFormModal({
  open,
  editingItem,
  form,
  saving,
  onClose,
  onSubmit,
  onFormChange
}: CheckFormModalProps) {
  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش چک' : 'ثبت چک جدید'}
      onClose={onClose}
      onSubmit={onSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره چک'}
    >
      <FormField label="شماره چک" required>
        <input
          type="text"
          value={form.checkNumber}
          onChange={e => onFormChange(f => ({ ...f, checkNumber: e.target.value }))}
          placeholder="شماره چک"
          dir="ltr"
        />
      </FormField>

      <FormField label="طرف حساب" required>
        <input
          type="text"
          value={form.counterparty}
          onChange={e => onFormChange(f => ({ ...f, counterparty: e.target.value }))}
          placeholder="نام طرف حساب"
        />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput
          value={form.amount}
          onChange={val => onFormChange(f => ({ ...f, amount: val }))}
        />
      </FormField>

      <FormField label="تاریخ صدور" required>
        <JalaliDatePicker
          value={form.creationDate}
          onChange={date => onFormChange(f => ({ ...f, creationDate: date }))}
        />
      </FormField>

      <FormField label="تاریخ سررسید" required>
        <JalaliDatePicker
          value={form.dueDate}
          onChange={date => onFormChange(f => ({ ...f, dueDate: date }))}
        />
      </FormField>
    </FormModal>
  )
}
