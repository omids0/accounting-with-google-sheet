import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { CheckFormState, CheckWithRow } from './types'

export type CheckFormModalProps = {
  open: boolean
  editingItem: CheckWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: CheckFormState) => void | Promise<void>
}

export default function CheckFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: CheckFormModalProps) {
  const initialValues = useMemo<CheckFormState>(
    () =>
      editingItem
        ? {
            checkNumber: editingItem.checkNumber,
            counterparty: editingItem.counterparty,
            amount: editingItem.amount,
            creationDate: editingItem.creationDate,
            dueDate: editingItem.dueDate
          }
        : {
            checkNumber: '',
            counterparty: '',
            amount: '',
            creationDate: getTodayIso(),
            dueDate: getTodayIso()
          },
    [editingItem]
  )

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش چک' : 'ثبت چک جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره چک'}
    >
      <FormField label="شماره چک" required>
        <input
          type="text"
          value={form.values.checkNumber}
          onChange={e => form.setField('checkNumber', e.target.value)}
          placeholder="شماره چک"
          dir="ltr"
        />
      </FormField>

      <FormField label="طرف حساب" required>
        <input
          type="text"
          value={form.values.counterparty}
          onChange={e => form.setField('counterparty', e.target.value)}
          placeholder="نام طرف حساب"
        />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput value={form.values.amount} onChange={val => form.setField('amount', val)} />
      </FormField>

      <FormField label="تاریخ صدور" required>
        <JalaliDatePicker
          value={form.values.creationDate}
          onChange={date => form.setField('creationDate', date)}
        />
      </FormField>

      <FormField label="تاریخ سررسید" required>
        <JalaliDatePicker
          value={form.values.dueDate}
          onChange={date => form.setField('dueDate', date)}
        />
      </FormField>
    </FormModal>
  )
}
