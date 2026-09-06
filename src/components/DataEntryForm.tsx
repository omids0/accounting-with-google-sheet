import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { FieldInput, getInitialFieldValue, sortFormFields } from './form'
import { useModalFormReset } from '../hooks/useModalFormReset'
import { getSettings, isConfigured } from '../services/settings'
import { appendRecord } from '../services/sheets'
import type { CustomForm } from '../types'
import { requireAuth } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'
import { showError, showSuccess } from '../utils/toast'
import Button from './ui/Button'
import { appFormClassName, formActionsClassName } from './ui/formStyles'

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

  const { handleSubmit, reset, setValue, watch } = useForm<Record<string, string | number>>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, { resetKey: activeForm.id })

  const values = watch()

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(String(values.category ?? ''))) {
      setValue('category', categories[0] ?? '')
    }
  }

  const onFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    await handleSubmit(async formValues => {
      if (!isConfigured() || !requireAuth()) return

      for (const field of activeForm.fields) {
        if (field.required) {
          const val = formValues[field.id]

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
          formValues
        )
        showSuccess(`در شیت «${activeForm.sheetName}» ذخیره شد`)
        reset(buildInitialValues(activeForm))
      } catch (err) {
        if (handleSheetError(err, { fallbackMessage: 'خطا در ذخیره' })) return
      } finally {
        onLoadingChange(false)
      }
    })(event)
  }

  return (
    <div className={appFormClassName()}>
      <form onSubmit={onFormSubmit}>
        {sortFormFields(activeForm.fields).map(field => (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id] ?? ''}
            onChange={next => setValue(field.id, next)}
            formId={activeForm.id}
            onCategoriesChange={handleCategoriesChange}
          />
        ))}

        <div className={formActionsClassName()}>
          <Button
            type="submit"
            variant={
              activeForm.type === 'expense'
                ? 'outflow'
                : activeForm.type === 'income'
                ? 'inflow'
                : 'primary'
            }
            disabled={loading}
          >
            {loading && <span className="spinner" />}
            ذخیره
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => onCancel?.()}>
            انصراف
          </Button>
        </div>
      </form>
    </div>
  )
}
