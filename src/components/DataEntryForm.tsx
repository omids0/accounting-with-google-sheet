import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import {
  FieldInput,
  FormRow,
  getInitialFieldValue,
  isStandardEntryForm,
  sortFormFields
} from './form'
import { useModalFormReset } from '../hooks/useModalFormReset'
import { getSettings, isConfigured } from '../services/settings'
import { appendRecord } from '../services/sheets'
import type { CustomForm, FieldConfig } from '../types'
import { requireAuth } from '../utils/authGuard'
import { cn } from '../utils/cn'
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
  onChange: (value: string | number) => void
  onCategoriesChange: (categories: string[]) => void
}

function EntryFieldRenderer({
  field,
  value,
  formId,
  controlWidth,
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
      onCategoriesChange={onCategoriesChange}
    />
  )
}

function StandardEntryFormFields({
  activeForm,
  values,
  setValue,
  onCategoriesRefresh
}: {
  activeForm: CustomForm
  values: Record<string, string | number>
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
        {useStandardLayout ? (
          <StandardEntryFormFields
            activeForm={activeForm}
            values={values}
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
