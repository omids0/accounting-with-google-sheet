import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
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

  const { handleSubmit, reset, setValue, watch } = useForm<Record<string, string | number>>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingRecord.id
  })

  const values = watch()

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(formValues => onSubmit(formValues))(event)
  }

  return (
    <FormModal
      open={open}
      title={`ویرایش ${editingForm.name}`}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel="ذخیره تغییرات"
      saveButtonVariant={
        editingForm.type === 'expense'
          ? 'outflow'
          : editingForm.type === 'income'
          ? 'inflow'
          : 'primary'
      }
    >
      {sortFormFields(editingForm.fields).map(field => (
        <FieldInput
          key={field.id}
          field={field}
          value={values[field.id] ?? ''}
          onChange={next => setValue(field.id, next)}
          formId={editingForm.id}
        />
      ))}
    </FormModal>
  )
}
