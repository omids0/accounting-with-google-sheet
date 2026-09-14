import { useEffect, useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import ConfirmActionModal from './ConfirmActionModal'
import StandardEntryFormFields from './dataEntry/StandardEntryFormFields'
import { FieldInput, getInitialFieldValue, isStandardEntryForm, sortFormFields } from './form'
import VehicleExpenseFields from './vehicleExpenses/VehicleExpenseFields'
import { useModalFormReset } from '../hooks/useModalFormReset'
import { useRetroactiveEntryWarning } from '../hooks/useRetroactiveEntryWarning'
import { useVehicleExpenseEntry } from '../hooks/useVehicleExpenseEntry'
import { refreshOpeningBalancesInBackground } from '../services/openingBalanceRefresh'
import { getSettings, isConfigured } from '../services/settings'
import { appendRecord } from '../services/sheets'
import { createManualVehicleExpense } from '../services/vehicleExpenseActions'
import type { CustomForm } from '../types'
import { requireAuth } from '../utils/authGuard'
import { cn } from '../utils/cn'
import { formFieldError } from '../utils/formValidation'
import { handleSheetError } from '../utils/sheetError'
import { showError, showSuccess } from '../utils/toast'
import { isVehicleExpenseCategory } from '../utils/vehicleExpenseUtils'
import Button from './ui/Button'
import { appFormClassName, formActionsClassName } from './ui/formStyles'
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

export default function DataEntryForm({
  activeForm,
  loading,
  onLoadingChange,
  onCancel,
  onCategoriesRefresh
}: DataEntryFormProps) {
  const initialValues = useMemo(() => buildInitialValues(activeForm), [activeForm])
  const useStandardLayout = isStandardEntryForm(activeForm)
  const isExpenseForm = activeForm.type === 'expense'
  const vehicleExpense = useVehicleExpenseEntry(isExpenseForm)

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

  useEffect(() => {
    vehicleExpense.resetVehicleValues()
  }, [activeForm.id, vehicleExpense.resetVehicleValues])

  useEffect(() => {
    clearErrors(['mileage', 'fuelPricePerLiter', 'expenseType', 'vehicleId', 'amount'])
  }, [vehicleExpense.vehicleValues, clearErrors])

  const retroactiveWarning = useRetroactiveEntryWarning()
  const values = watch()
  const showVehicleFields = isExpenseForm && isVehicleExpenseCategory(String(values.category ?? ''))

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
      if (showVehicleFields && field.id === 'title') continue

      const val = formValues[field.id]

      if (val === '' || val === undefined || val === null) {
        const message = `«${field.label}» الزامی است`
        setError(field.id, { message })
        firstMessage ??= message
        hasError = true
      }
    }

    if (showVehicleFields) {
      const vehicleErrors = vehicleExpense.validateVehicleExpense(
        String(formValues.category ?? ''),
        formValues.amount ?? ''
      )

      if (vehicleErrors) {
        firstMessage ??= Object.values(vehicleErrors).find(Boolean)
        hasError = true
      }
    }

    if (firstMessage) showError(firstMessage)

    return !hasError
  }

  const saveRecord = async (formValues: Record<string, string | number>) => {
    onLoadingChange(true)
    try {
      const settings = getSettings()!

      if (showVehicleFields) {
        await createManualVehicleExpense(
          settings.spreadsheetId,
          vehicleExpense.buildVehicleExpenseInput(formValues)
        )
      } else {
        await appendRecord(
          settings.spreadsheetId,
          activeForm,
          crypto.randomUUID(),
          new Date().toLocaleString('fa-IR'),
          formValues
        )
      }

      showSuccess(`در شیت «${activeForm.sheetName}» ذخیره شد`)
      refreshOpeningBalancesInBackground()
      reset(buildInitialValues(activeForm))
      vehicleExpense.resetVehicleValues()
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
        confirmLabel={retroactiveWarning.confirmLabel}
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
            showVehicleFields={showVehicleFields}
            vehicleExpense={vehicleExpense}
          />
        ) : (
          sortFormFields(activeForm.fields).map(field => {
            if (showVehicleFields && field.id === 'title') return null

            const fieldError =
              showVehicleFields && field.id === 'amount'
                ? vehicleExpense.fieldErrors.amount || formFieldError(errors, field.id)
                : formFieldError(errors, field.id)

            return (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.id] ?? ''}
                onChange={next => {
                  if (showVehicleFields && field.id === 'amount') {
                    vehicleExpense.clearFieldError('amount')
                  }
                  setValue(field.id, next)
                }}
                formId={activeForm.id}
                error={fieldError}
                onCategoriesChange={handleCategoriesChange}
              />
            )
          })
        )}

        {!useStandardLayout && showVehicleFields ? (
          <VehicleExpenseFields
            values={vehicleExpense.vehicleValues}
            amount={values.amount ?? ''}
            onChange={vehicleExpense.patchVehicleValues}
            vehicles={vehicleExpense.vehicles}
            expenseTypes={vehicleExpense.expenseTypes}
            onExpenseTypesChange={vehicleExpense.setExpenseTypes}
            errors={vehicleExpense.fieldErrors}
          />
        ) : null}

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
            disabled={loading || vehicleExpense.loading}
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
