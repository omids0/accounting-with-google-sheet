import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import type { StoredRecord } from './recordsUtils'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { useVehicleExpenseEntry } from '../../hooks/useVehicleExpenseEntry'
import { getSettings } from '../../services/settings'
import { metaToFormValues } from '../../services/vehicleExpenseActions'
import { findVehicleExpenseMetaByRecordId } from '../../services/vehicleExpenseRecords'
import type { CustomForm, FieldConfig } from '../../types'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'
import { FieldInput, sortFormFields } from '../form'
import FormModal from '../FormModal'
import VehicleExpenseFields from '../vehicleExpenses/VehicleExpenseFields'

type RecordsEditFormModalProps = {
  open: boolean
  editingForm: CustomForm
  editingRecord: StoredRecord
  saving: boolean
  onClose: () => void
  onSubmit: (
    values: Record<string, string | number>,
    vehicleExpense?: ReturnType<typeof useVehicleExpenseEntry>['vehicleValues']
  ) => void | Promise<void>
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

  const [fields, setFields] = useState<FieldConfig[]>(editingForm.fields)
  const isExpenseForm = editingForm.type === 'expense'
  const vehicleExpense = useVehicleExpenseEntry(open && isExpenseForm)

  const { handleSubmit, reset, setValue, watch } = useForm<Record<string, string | number>>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingRecord.id
  })

  useEffect(() => {
    if (open) {
      setFields(editingForm.fields)
    }
  }, [open, editingForm.fields, editingForm.id])

  useEffect(() => {
    if (!open || !isExpenseForm) return

    const category = String(initialValues.category ?? '')

    if (!isVehicleExpenseCategory(category)) {
      vehicleExpense.resetVehicleValues()

      return
    }

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    void findVehicleExpenseMetaByRecordId(spreadsheetId, editingRecord.id).then(meta => {
      vehicleExpense.resetVehicleValues(meta ? metaToFormValues(meta) : undefined)
    })
  }, [
    open,
    isExpenseForm,
    editingRecord.id,
    initialValues.category,
    vehicleExpense.resetVehicleValues
  ])

  const values = watch()
  const showVehicleFields = isExpenseForm && isVehicleExpenseCategory(String(values.category ?? ''))

  const handleCategoriesChange = (categories: string[]) => {
    setFields(current =>
      current.map(field => (field.id === 'category' ? { ...field, options: categories } : field))
    )
  }

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(formValues =>
      onSubmit(formValues, showVehicleFields ? vehicleExpense.vehicleValues : undefined)
    )(event)
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
      {sortFormFields(fields).map(field => {
        if (showVehicleFields && field.id === 'title') return null

        return (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id] ?? ''}
            onChange={next => setValue(field.id, next)}
            formId={editingForm.id}
            onCategoriesChange={handleCategoriesChange}
          />
        )
      })}

      {showVehicleFields ? (
        <VehicleExpenseFields
          values={vehicleExpense.vehicleValues}
          amount={values.amount ?? ''}
          onChange={vehicleExpense.patchVehicleValues}
          vehicles={vehicleExpense.vehicles}
          expenseTypes={vehicleExpense.expenseTypes}
          onExpenseTypesChange={vehicleExpense.setExpenseTypes}
          disabled={saving}
          errors={vehicleExpense.fieldErrors}
        />
      ) : null}
    </FormModal>
  )
}
