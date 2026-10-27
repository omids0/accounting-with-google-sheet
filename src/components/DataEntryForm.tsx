import { useEffect, useMemo, useRef, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import AttachmentField from './attachments/AttachmentField'
import { useAttachmentDrafts } from './attachments/useAttachmentDrafts'
import { useBuildingEntryAccount } from './buildings/useEntryFundAccount'
import {
  hasBuildingExpenseFields,
  LazyBuildingExpenseFields,
  prepareBuildingEntry
} from './dataEntry/buildingExpenseEntry'
import CustomEntryFormFields from './dataEntry/CustomEntryFormFields'
import EntryDraftNote from './dataEntry/EntryDraftNote'
import EntryDuplicateWarning from './dataEntry/EntryDuplicateWarning'
import EntryFormActions from './dataEntry/EntryFormActions'
import RetroactiveEntryModal from './dataEntry/RetroactiveEntryModal'
import StandardEntryFormFields from './dataEntry/StandardEntryFormFields'
import { focusEntryAmount, type DataEntryFormProps } from './dataEntry/types'
import { useEntryDraft } from './dataEntry/useEntryDraft'
import { useEntryValidation } from './dataEntry/useEntryValidation'
import { useTemplateFill } from './dataEntry/useTemplateFill'
import { settleSavedEntry, writeEntryRecord } from './dataEntry/writeEntryRecord'
import { buildFormInitialValues, isStandardEntryForm, withAutoTitle } from './form'
import { SUBCATEGORY_FIELD_ID } from './form/fieldUtils'
import { isVehicleExpenseCategory, parseNumericField } from '../utils/vehicleExpenseUtils'
import { readSubcategories } from './form/categorySelect/useSubcategoryManager'
import { showSavedForEntry } from './nudges/saveNudges'
import { useLinkTarget } from '../hooks/useLinkTarget'
import { useModalFormReset } from '../hooks/useModalFormReset'
import { useRetroactiveEntryWarning } from '../hooks/useRetroactiveEntryWarning'
import { useSubmitLock } from '../hooks/useSubmitLock'
import { useUnsavedWork } from '../hooks/useUserBusy'
import { useVehicleExpenseEntry } from '../hooks/useVehicleExpenseEntry'
import { prepareEntryValues, smsBalanceHint } from '../services/entryWallet'
import { refreshOpeningBalancesInBackground } from '../services/openingBalanceRefresh'
import { getSettings, isConfigured } from '../services/settings'
import { requireAuth } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'
import { showError } from '../utils/toast'
import { resolveCategoryType } from './form/categorySelect/useCategorySelectActions'
import { useSharedTick } from './shared/sharedTickEntry'
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

  useTemplateFill(template, activeForm, formRef, setValue, clearErrors)

  const nextEntryPrefill = useBuildingEntryAccount(activeForm, getValues, setValue)
  const retroactiveWarning = useRetroactiveEntryWarning()
  const values = watch()
  const duplicateWarning = <EntryDuplicateWarning form={activeForm} values={values} />
  const tick = useSharedTick(activeForm, values)
  const selectedCategory = String(values.category ?? '')
  const showVehicleFields = isExpenseForm && isVehicleExpenseCategory(selectedCategory)
  // «بدهی»/«طلب»: the record may pay an open debt or receivable (the pick stays out of `values`).
  const linkTarget = useLinkTarget({
    type: activeForm.type,
    category: selectedCategory,
    subCategory: String(values[SUBCATEGORY_FIELD_ID] ?? ''),
    amount: values.amount ?? ''
  })
  // An amount on screen is work in progress: the update banner waits for it.
  useUnsavedWork(String(values.amount ?? '').trim() !== '')

  // Only the plain /entry page keeps a draft; a pre-filled or onboarding form has its own start.
  const draft = useEntryDraft({
    formId: activeForm.id,
    enabled: !prefill && !bankSms && !onSaved,
    fieldIds: activeForm.fields.map(field => field.id),
    initialValues,
    values,
    setValue,
    reset
  })

  const hasSubcategories =
    readSubcategories(resolveCategoryType(undefined, activeForm.id), selectedCategory).length > 0

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(selectedCategory)) {
      setValue('category', categories[0] ?? '')
    }
  }

  const validateRequiredFields = useEntryValidation({
    activeForm,
    formRef,
    vehicleExpense,
    showVehicleFields,
    selectedCategory,
    hasSubcategories,
    setError,
    clearErrors
  })

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
        tick.mark(formValues),
        vehicleInput,
        bankSms
      )
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره' })
      onLoadingChange(false)

      return
    }

    // The record exists now: a wallet/SMS failure must not invite a second save.
    await attachments.commit(settings.spreadsheetId, activeForm.sheetName, recordId)
    await settleSavedEntry(
      settings.spreadsheetId,
      activeForm,
      formValues,
      bankSms,
      recordId,
      linkTarget.attach
    )
    const keepAccount = nextEntryPrefill(entered)

    showSavedForEntry(activeForm, recordId, formValues, vehicleInput)
    refreshOpeningBalancesInBackground()
    onLoadingChange(false)
    draft.clearDraft()
    if (onSaved && !keepOpen) return onSaved()
    reset(buildFormInitialValues(activeForm, keepAccount))
    vehicleExpense.resetVehicleValues()
    linkTarget.reset()
    attachments.reset()
    tick.reset()
    if (keepOpen) focusEntryAmount(formRef.current)
  }

  const submitLock = useSubmitLock()

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Three quick taps on «ذخیره» must create one record, not three.
    void submitLock(() => submitEntry(event))
  }

  const submitEntry = async (event: FormEvent<HTMLFormElement>) => {
    clearErrors()
    // «ذخیره و بعدی» submits too; it keeps the form open for the next entry.
    const keepOpen = !!(event.nativeEvent as SubmitEvent).submitter?.hasAttribute('data-save-next')
    const formValues = getValues()

    if (!validateRequiredFields(formValues)) return
    if (linkTarget.blocker) return showError(linkTarget.blocker)
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
      <RetroactiveEntryModal warning={retroactiveWarning} />
      {draft.restored && <EntryDraftNote onDiscard={draft.discard} />}
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
            linkTarget={linkTarget}
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
        {tick.element}
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
          onCancel={() => {
            draft.clearDraft()
            onCancel?.()
          }}
          showSaveNext={!bankSms}
        />
      </form>
    </div>
  )
}
