import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import { FormField } from '../form'
import FormModal from '../FormModal'
import type { TimesheetWithRow } from './useTimesheetsPage'

type TimesheetFormValues = {
  title: string
  description: string
}

type TimesheetFormModalProps = {
  open: boolean
  editingItem: TimesheetWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: TimesheetFormValues) => void | Promise<void>
}

export default function TimesheetFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: TimesheetFormModalProps) {
  const initialValues = useMemo<TimesheetFormValues>(
    () =>
      editingItem
        ? { title: editingItem.title, description: editingItem.description }
        : { title: '', description: '' },
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
      title={editingItem ? 'ویرایش تایم‌شیت' : 'تایم‌شیت جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره' : 'ایجاد'}
    >
      <FormField label="عنوان" required>
        <input
          type="text"
          className="form-control"
          value={form.values.title}
          onChange={e => form.setField('title', e.target.value)}
          placeholder="مثلاً: پروژه الف"
          autoFocus
        />
      </FormField>

      <FormField label="توضیحات" className="form-field-note">
        <textarea
          className="form-control form-note-textarea"
          rows={3}
          value={form.values.description}
          onChange={e => form.setField('description', e.target.value)}
          placeholder="توضیحات اضافه..."
        />
      </FormField>
    </FormModal>
  )
}

export type { TimesheetFormValues }
