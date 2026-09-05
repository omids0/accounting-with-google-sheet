import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import type { CustomForm } from '../../types'
import { FieldInput, sortFormFields } from '../form'
import FormModal from '../FormModal'
import type { StoredRecord } from './recordsUtils'

type RecordsEditFormModalProps = {
  open: boolean
  editingForm: CustomForm
  editingRecord: StoredRecord
  saving: boolean
  onClose: () => void
  onSubmit: (values: Record<string, string | number>) => void | Promise<void>
}

function buildInitialValues(
  editingForm: CustomForm,
  editingRecord: StoredRecord
): Record<string, string | number> {
  const values: Record<string, string | number> = {}

  editingForm.fields.forEach(field => {
    const raw = editingRecord.values[field.id] ?? ''

    if (field.type === 'number') {
      values[field.id] = raw === '' ? '' : Number(raw)
    } else {
      values[field.id] = raw
    }
  })

  return values
}

export default function RecordsEditFormModal({
  open,
  editingForm,
  editingRecord,
  saving,
  onClose,
  onSubmit
}: RecordsEditFormModalProps) {
  const initialValues = useMemo(
    () => buildInitialValues(editingForm, editingRecord),
    [editingForm, editingRecord]
  )

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingRecord.id
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values)
  }

  return (
    <FormModal
      open={open}
      title={`ویرایش ${editingForm.name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel="ذخیره تغییرات"
      saveButtonClassName={`btn ${
        editingForm.type === 'expense'
          ? 'btn-outflow'
          : editingForm.type === 'income'
          ? 'btn-inflow'
          : 'btn-primary'
      }`}
    >
      {sortFormFields(editingForm.fields).map(field => (
        <FieldInput
          key={field.id}
          field={field}
          value={form.values[field.id] ?? ''}
          onChange={next => form.setField(field.id, next)}
          formId={editingForm.id}
        />
      ))}
    </FormModal>
  )
}
