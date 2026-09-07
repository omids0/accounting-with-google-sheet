import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import ConfirmActionModal from './ConfirmActionModal'
import {
  FieldInput,
  FormRow,
  getInitialFieldValue,
  isStandardEntryForm,
  sortFormFields
} from './form'
import { useModalFormReset } from '../hooks/useModalFormReset'
import { useRetroactiveEntryWarning } from '../hooks/useRetroactiveEntryWarning'
import { getSettings, isConfigured } from '../services/settings'
import { appendRecord } from '../services/sheets'
import type { CustomForm, FieldConfig } from '../types'
import { requireAuth } from '../utils/authGuard'
import { cn } from '../utils/cn'
import { formFieldError } from '../utils/formValidation'
import { handleSheetError } from '../utils/sheetError'
import { showError, showSuccess } from '../utils/toast'
import Button from './ui/Button'
import { appFormClassName, formActionsClassName, type FormControlWidth } from './ui/formStyles'
import { dataEntryFormActionsClass } from './ui/recordsStyles'

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

type EntryFieldRendererProps = {
  field: FieldConfig
  value: string | number
  formId: string
  controlWidth?: FormControlWidth
  error?: string
  onChange: (value: string | number) => void
  onCategoriesChange: (categories: string[]) => void
}

function EntryFieldRenderer({
  field,
  value,
  formId,
  controlWidth,
  error,
  onChange,
  onCategoriesChange
}: EntryFieldRendererProps) {
  return (
    <FieldInput
      field={field}
      value={value}
      onChange={onChange}
      formId={formId}
      controlWidth={controlWidth}
      error={error}
      onCategoriesChange={onCategoriesChange}
    />
  )
}

function StandardEntryFormFields({
  activeForm,
  values,
  errors,
  setValue,
  onCategoriesRefresh
}: {
  activeForm: CustomForm
  values: Record<string, string | number>
  errors: ReturnType<typeof useForm<Record<string, string | number>>>['formState']['errors']
  setValue: (id: string, value: string | number) => void
  onCategoriesRefresh: () => void
}) {
  const fieldById = useMemo(
    () => new Map(activeForm.fields.map(field => [field.id, field])),
    [activeForm.fields]
  )

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(String(values.category ?? ''))) {
      setValue('category', categories[0] ?? '')
    }
  }

  const renderField = (id: string, options?: { controlWidth?: FormControlWidth }) => {
    const field = fieldById.get(id)

    if (!field) return null

    return (
      <EntryFieldRenderer
        key={field.id}
        field={field}
        value={values[field.id] ?? ''}
        formId={activeForm.id}
        controlWidth={options?.controlWidth}
        error={formFieldError(errors, field.id)}
        onChange={next => setValue(field.id, next)}
        onCategoriesChange={handleCategoriesChange}
      />
    )
  }

  return (
    <>
      <FormRow>
        {renderField('date', { controlWidth: 'full' })}
        {renderField('amount', { controlWidth: 'full' })}
      </FormRow>
      {renderField('title', { controlWidth: 'full' })}
      {renderField('category')}
      {renderField('note')}
    </>
  )
}

export default function DataEntryForm({
  activeForm,
  loading,
  onLoadingChange,
  onCancel,
  onCategoriesRefresh
}: DataEntryFormProps) {
  const initialValues = useMemo(() => buildInitialValues(activeForm), [activeForm])
  const useStandardLayout = isStandardEntryForm(activeForm)

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm<Record<string, string | number>>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, { resetKey: activeForm.id })

  const retroactiveWarning = useRetroactiveEntryWarning()

  const values = watch()

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(String(values.category ?? ''))) {
      setValue('category', categories[0] ?? '')
    }
  }

  const validateRequiredFields = (formValues: Record<string, string | number>) => {
    clearErrors()
    let hasError = false
    let firstMessage: string | undefined

    for (const field of activeForm.fields) {
      if (!field.required) continue

      const val = formValues[field.id]

      if (val === '' || val === undefined || val === null) {
        const message = `«${field.label}» الزامی است`
        setError(field.id, { message })
        firstMessage ??= message
        hasError = true
      }
    }

    if (firstMessage) {
      showError(firstMessage)
    }

    return !hasError
  }

  const saveRecord = async (formValues: Record<string, string | number>) => {
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
  }

  const onFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    await handleSubmit(async formValues => {
      if (!validateRequiredFields(formValues)) return
      if (!isConfigured() || !requireAuth()) return

      const dateFieldId = activeForm.fields.find(field => field.type === 'date')?.id

      const dateValue = dateFieldId ? String(formValues[dateFieldId] ?? '') : ''

      if (retroactiveWarning.guard(dateValue, () => saveRecord(formValues))) return

      await saveRecord(formValues)
    })(event)
  }

  return (
    <div className={appFormClassName()}>
      <ConfirmActionModal
        open={retroactiveWarning.open}
        title={retroactiveWarning.title}
        message={retroactiveWarning.message}
        confirming={retroactiveWarning.confirming}
        confirmLabel="ثبت کن"
        onClose={retroactiveWarning.cancel}
        onConfirm={retroactiveWarning.confirm}
      />
      <form onSubmit={onFormSubmit}>
        {useStandardLayout ? (
          <StandardEntryFormFields
            activeForm={activeForm}
            values={values}
            errors={errors}
            setValue={(id, value) => setValue(id, value)}
            onCategoriesRefresh={onCategoriesRefresh}
          />
        ) : (
          sortFormFields(activeForm.fields).map(field => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id] ?? ''}
              onChange={next => setValue(field.id, next)}
              formId={activeForm.id}
              error={formFieldError(errors, field.id)}
              onCategoriesChange={handleCategoriesChange}
            />
          ))
        )}

        <div className={cn(formActionsClassName(), dataEntryFormActionsClass)}>
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
            loading={loading}
          >
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
