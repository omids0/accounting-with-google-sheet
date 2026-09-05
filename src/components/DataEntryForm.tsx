import { useMemo, type FormEvent } from 'react'

import { FieldInput, getInitialFieldValue, sortFormFields } from './form'
import { useForm } from '../hooks/useForm'
import { getSettings, isConfigured } from '../services/settings'
import { appendRecord } from '../services/sheets'
import type { CustomForm } from '../types'
import { requireAuth } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'
import { showError, showSuccess } from '../utils/toast'

type DataEntryFormProps = {
  activeForm: CustomForm
  loading: boolean
  onLoadingChange: (loading: boolean) => void
  onCancel?: () => void
  onCategoriesRefresh: () => void
}

function buildInitialValues(form: CustomForm): Record<string, string | number> {
  const initial: Record<string, string | number> = {}

  form.fields.forEach(field => {
    initial[field.id] = getInitialFieldValue(field)
  })

  return initial
}

export default function DataEntryForm({
  activeForm,
  loading,
  onLoadingChange,
  onCancel,
  onCategoriesRefresh
}: DataEntryFormProps) {
  const initialValues = useMemo(() => buildInitialValues(activeForm), [activeForm])

  const form = useForm(initialValues, { resetKey: activeForm.id })

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(String(form.values.category ?? ''))) {
      form.setField('category', categories[0] ?? '')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isConfigured() || !requireAuth()) return

    for (const field of activeForm.fields) {
      if (field.required) {
        const val = form.values[field.id]

        if (val === '' || val === undefined || val === null) {
          showError(`فیلد «${field.label}» الزامی است`)

          return
        }
      }
    }

    onLoadingChange(true)
    try {
      const settings = getSettings()!

      await appendRecord(
        settings.spreadsheetId,
        activeForm,
        crypto.randomUUID(),
        new Date().toLocaleString('fa-IR'),
        form.values
      )
      showSuccess(`در شیت «${activeForm.sheetName}» ذخیره شد`)
      form.reset(buildInitialValues(activeForm))
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در ذخیره' })) return
    } finally {
      onLoadingChange(false)
    }
  }

  return (
    <div className="app-form">
      <form onSubmit={handleSubmit}>
        {sortFormFields(activeForm.fields).map(field => (
          <FieldInput
            key={field.id}
            field={field}
            value={form.values[field.id] ?? ''}
            onChange={next => form.setField(field.id, next)}
            formId={activeForm.id}
            onCategoriesChange={handleCategoriesChange}
          />
        ))}

        <div className="form-actions">
          <button
            type="submit"
            className={`btn ${
              activeForm.type === 'expense'
                ? 'btn-outflow'
                : activeForm.type === 'income'
                ? 'btn-inflow'
                : 'btn-primary'
            }`}
            disabled={loading}
          >
            {loading && <span className="spinner" />}
            ذخیره
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => onCancel?.()}
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  )
}
