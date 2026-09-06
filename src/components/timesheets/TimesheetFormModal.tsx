import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { FormField } from '../form'
import FormModal from '../FormModal'
import type { TimesheetWithRow } from './useTimesheetsPage'
import { formNoteTextareaClass } from '../ui/formControlStyles'
import { formControlClassName } from '../ui/formStyles'
import { formFieldNoteClass } from '../ui/recordsStyles'

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

  const { register, handleSubmit, reset } = useForm<TimesheetFormValues>({
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
      title={editingItem ? 'ویرایش تایم‌شیت' : 'تایم‌شیت جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره' : 'ایجاد'}
    >
      <FormField label="عنوان" required>
        <input
          type="text"
          className={formControlClassName()}
          {...register('title')}
          placeholder="مثلاً: پروژه الف"
          autoFocus
        />
      </FormField>

      <FormField label="توضیحات" className={formFieldNoteClass}>
        <textarea
          className={formControlClassName(formNoteTextareaClass)}
          rows={3}
          {...register('description')}
          placeholder="توضیحات اضافه..."
        />
      </FormField>
    </FormModal>
  )
}

export type { TimesheetFormValues }
