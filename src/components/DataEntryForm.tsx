import { useEffect, useMemo, useRef, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import AttachmentField from './attachments/AttachmentField'
import { useAttachmentDrafts } from './attachments/useAttachmentDrafts'
import { useBuildingEntryAccount } from './buildings/useEntryFundAccount'
import ConfirmActionModal from './ConfirmActionModal'
import {
  hasBuildingExpenseFields,
  LazyBuildingExpenseFields,
  prepareBuildingEntry,
  settleBuildingEntry
} from './dataEntry/buildingExpenseEntry'
import CustomEntryFormFields from './dataEntry/CustomEntryFormFields'
import EntryDuplicateWarning from './dataEntry/EntryDuplicateWarning'
import EntryFormActions from './dataEntry/EntryFormActions'
import { entryValidationErrors } from './dataEntry/entryValidationErrors'
import StandardEntryFormFields from './dataEntry/StandardEntryFormFields'
import { focusEntryAmount, templateFormValues, type DataEntryFormProps } from './dataEntry/types'
import { writeEntryRecord } from './dataEntry/writeEntryRecord'
import { buildFormInitialValues, isStandardEntryForm, withAutoTitle } from './form'
import { focusFirstInvalidField } from '../utils/focusInvalidField'
import { showError } from '../utils/toast'
import { isVehicleExpenseCategory, parseNumericField } from '../utils/vehicleExpenseUtils'
import { readSubcategories } from './form/categorySelect/useSubcategoryManager'
import { showSavedForEntry } from './nudges/saveNudges'
import { useModalFormReset } from '../hooks/useModalFormReset'
import { useRetroactiveEntryWarning } from '../hooks/useRetroactiveEntryWarning'
import { useUnsavedWork } from '../hooks/useUserBusy'
import { useVehicleExpenseEntry } from '../hooks/useVehicleExpenseEntry'
import { prepareEntryValues, settleEntryWallet, smsBalanceHint } from '../services/entryWallet'
import { refreshOpeningBalancesInBackground } from '../services/openingBalanceRefresh'
import { getSettings, isConfigured } from '../services/settings'
import { requireAuth } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'
import { resolveCategoryType } from './form/categorySelect/useCategorySelectActions'
import { appFormClassName } from './ui/formStyles'
import { entryFormGridClass } from './ui/recordsStyles'

export default function DataEntryForm({
  activeForm,
  loading,
  onLoadingChange,
  onCancel,
  onCategoriesRefresh,
  prefill,
  bankSms,
  onSaved,
  template
}: DataEntryFormProps) {
  const initialValues = useMemo(
    () => buildFormInitialValues(activeForm, prefill),
    [activeForm, prefill]
  )
  const useStandardLayout = isStandardEntryForm(activeForm)
  const formRef = useRef<HTMLFormElement>(null)
  const isExpenseForm = activeForm.type === 'expense'
  const vehicleExpense = useVehicleExpenseEntry(isExpenseForm, true)
  const attachments = useAttachmentDrafts({ open: true, resetKey: activeForm.id })

  const { reset, setValue, watch, setError, clearErrors, getValues, formState } = useForm<
    Record<string, string | number>
  >({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  const { errors } = formState

  useModalFormReset(reset, initialValues, {
    resetKey: `${activeForm.id}:${bankSms?.sms.id ?? ''}`
  })

  useEffect(() => {
    vehicleExpense.resetVehicleValues()
  }, [activeForm.id, vehicleExpense.resetVehicleValues])

  // A «پرتکرار» chip: fill the form, then the amount, selected so typing replaces it.
  useEffect(() => {
    if (!template) return

    const fieldIds = new Set(activeForm.fields.map(field => field.id))

    Object.entries(templateFormValues(template.value)).forEach(([id, value]) => {
      if (fieldIds.has(id)) setValue(id, value)
    })
    clearErrors()
    focusEntryAmount(formRef.current, true)
  }, [template, activeForm.fields, setValue, clearErrors])

  const nextEntryPrefill = useBuildingEntryAccount(activeForm, getValues, setValue)
  const retroactiveWarning = useRetroactiveEntryWarning()
  const values = watch()
  const duplicateWarning = <EntryDuplicateWarning form={activeForm} values={values} />
  const selectedCategory = String(values.category ?? '')
  const showVehicleFields = isExpenseForm && isVehicleExpenseCategory(selectedCategory)
  // An amount on screen is work in progress: the update banner waits for it.
  useUnsavedWork(String(values.amount ?? '').trim() !== '')

  const hasSubcategories =
    readSubcategories(resolveCategoryType(undefined, activeForm.id), selectedCategory).length > 0

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(selectedCategory)) {
      setValue('category', categories[0] ?? '')
    }
  }

  const validateRequiredFields = (formValues: Record<string, string | number>) => {
    clearErrors()

    const found = entryValidationErrors(activeForm, formValues, {
      showVehicleFields,
      selectedCategory,
      hasSubcategories
    })

    found.forEach(error => error.id && setError(error.id, { message: error.message }))

    let hasError = found.length > 0
    let firstMessage: string | undefined = found[0]?.message

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
    if (hasError) focusFirstInvalidField(formRef.current)

    return !hasError
  }

  const saveRecord = async (entered: Record<string, string | number>, keepOpen = false) => {
    onLoadingChange(true)
    const settings = getSettings()!
    const formValues = prepareBuildingEntry(
      activeForm,
      prepareEntryValues(activeForm.type, withAutoTitle(entered), bankSms)
    )
    const vehicleInput = showVehicleFields
      ? vehicleExpense.buildVehicleExpenseInput(formValues)
      : null
    let recordId: string

    try {
      recordId = await writeEntryRecord(
        settings.spreadsheetId,
        activeForm,
        formValues,
        vehicleInput
      )
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره' })
      onLoadingChange(false)

      return
    }

    // The record exists now: a wallet/SMS failure must not invite a second save.
    await attachments.commit(settings.spreadsheetId, activeForm.sheetName, recordId)
    await settleEntryWallet(
      settings.spreadsheetId,
      activeForm.type,
      formValues,
      bankSms,
      recordId
    ).catch(() => showError('رکورد ذخیره شد ولی موجودی حساب به‌روز نشد'))
    await settleBuildingEntry(settings.spreadsheetId, activeForm, recordId, formValues).catch(() =>
      showError('هزینه ذخیره شد ولی سهم واحدها یا بدهی ثبت نشد؛ آن را دوباره ذخیره کن')
    )
    const keepAccount = nextEntryPrefill(entered)

    showSavedForEntry(activeForm, recordId, formValues, vehicleInput)
    refreshOpeningBalancesInBackground()
    onLoadingChange(false)
    if (onSaved && !keepOpen) return onSaved()
    reset(buildFormInitialValues(activeForm, keepAccount))
    vehicleExpense.resetVehicleValues()
    attachments.reset()
    if (keepOpen) focusEntryAmount(formRef.current)
  }

  const onFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearErrors()
    // «ذخیره و بعدی» submits too; it keeps the form open for the next entry.
    const keepOpen = !!(event.nativeEvent as SubmitEvent).submitter?.hasAttribute('data-save-next')
    const formValues = getValues()

    if (!validateRequiredFields(formValues)) return
    if (!isConfigured() || !requireAuth()) return

    const dateFieldId = activeForm.fields.find(field => field.type === 'date')?.id
    const dateValue = dateFieldId ? String(formValues[dateFieldId] ?? '') : ''

    if (retroactiveWarning.guard(dateValue, () => saveRecord(formValues, keepOpen))) return

    await saveRecord(formValues, keepOpen)
  }

  useEffect(() => {
    if (!showVehicleFields) return

    if (parseNumericField(values.amount) > 0) {
      vehicleExpense.clearFieldError('amount')
      clearErrors('amount')
    }
  }, [values.amount, showVehicleFields, vehicleExpense.clearFieldError, clearErrors])

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
      <form
        ref={formRef}
        onSubmit={onFormSubmit}
        noValidate
        className={useStandardLayout ? entryFormGridClass : undefined}
      >
        {useStandardLayout ? (
          <StandardEntryFormFields
            activeForm={activeForm}
            values={values}
            errors={errors}
            setValue={(id, value) => setValue(id, value)}
            onCategoriesRefresh={onCategoriesRefresh}
            showVehicleFields={showVehicleFields}
            vehicleExpense={vehicleExpense}
            walletApplyHint={smsBalanceHint(bankSms, String(values.walletAccount ?? ''))}
            beforeAccount={
              hasBuildingExpenseFields(activeForm) ? (
                <LazyBuildingExpenseFields
                  part="who"
                  values={values}
                  setValue={(id, value) => setValue(id, value)}
                  disabled={loading}
                />
              ) : null
            }
            afterAmount={duplicateWarning}
            clearFieldError={fieldId => {
              vehicleExpense.clearFieldError(fieldId as keyof typeof vehicleExpense.fieldErrors)
              clearErrors(fieldId)
            }}
          />
        ) : (
          <CustomEntryFormFields
            activeForm={activeForm}
            values={values}
            errors={errors}
            setValue={(id, value) => setValue(id, value)}
            clearAmountError={() => {
              vehicleExpense.clearFieldError('amount')
              clearErrors('amount')
            }}
            showVehicleFields={showVehicleFields}
            hasSubcategories={hasSubcategories}
            vehicleExpense={vehicleExpense}
            selectedCategory={selectedCategory}
            onCategoriesChange={handleCategoriesChange}
            afterAmount={duplicateWarning}
          />
        )}

        <AttachmentField state={attachments} disabled={loading} />
        {hasBuildingExpenseFields(activeForm) && useStandardLayout ? (
          <LazyBuildingExpenseFields
            part="split"
            values={values}
            setValue={(id, value) => setValue(id, value)}
            disabled={loading}
          />
        ) : null}
        <EntryFormActions
          formType={activeForm.type}
          loading={loading}
          saveDisabled={loading || vehicleExpense.loading}
          onCancel={onCancel}
          showSaveNext={!bankSms}
        />
      </form>
    </div>
  )
}
