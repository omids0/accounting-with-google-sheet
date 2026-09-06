import {
  createCounterparty,
  deleteCounterparty,
  fetchCounterparties,
  getCounterpartyFullName,
  reorderCounterparties,
  updateCounterparty
} from '../../../services/counterparties'
import { getSettings } from '../../../services/settings'
import { requireAuth } from '../../../utils/authGuard'
import { reorderItems } from '../../../utils/reorderItems'
import { handleSheetError } from '../../../utils/sheetError'
import { showError, showSuccess } from '../../../utils/toast'
import {
  buildCounterpartyPayload,
  validateCounterpartyForm
} from '../../counterparties/counterpartyFormPayload'
import type { CounterpartyFormState, CounterpartyWithRow } from '../../counterparties/types'

export interface CounterpartySelectProps {
  value: string
  onChange: (value: string) => void
  counterparties: CounterpartyWithRow[]
  onCounterpartiesChange?: (counterparties: CounterpartyWithRow[]) => void
  disabled?: boolean
  'aria-label'?: string
  id?: string
  invalid?: boolean
}

export function useCounterpartySelectActions({
  counterparties,
  onCounterpartiesChange,
  onChange,
  value,
  setSaving
}: {
  counterparties: CounterpartyWithRow[]
  onCounterpartiesChange?: (counterparties: CounterpartyWithRow[]) => void
  onChange: (value: string) => void
  value: string
  setSaving: (saving: boolean) => void
}) {
  const refreshList = async (): Promise<CounterpartyWithRow[]> => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return counterparties

    const next = await fetchCounterparties(settings.spreadsheetId)

    onCounterpartiesChange?.(next)

    return next
  }

  const handleSubmitForm = async (
    values: CounterpartyFormState,
    editingItem: CounterpartyWithRow | null
  ): Promise<boolean> => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید')

      return false
    }
    if (!requireAuth()) return false

    const validationError = validateCounterpartyForm(values)

    if (validationError) {
      showError(validationError)

      return false
    }

    const payload = buildCounterpartyPayload(values)
    const previousName = editingItem ? getCounterpartyFullName(editingItem) : ''
    const nextName = getCounterpartyFullName(payload)

    setSaving(true)
    try {
      if (editingItem) {
        await updateCounterparty(settings.spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          ...payload
        })
        showSuccess('طرف حساب ویرایش شد')
      } else {
        await createCounterparty(settings.spreadsheetId, payload)
        showSuccess('طرف حساب جدید ثبت شد')
      }

      await refreshList()

      if (!editingItem || value === previousName) {
        onChange(nextName)
      }

      return true
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره طرف حساب' })

      return false
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (
    item: CounterpartyWithRow,
    setConfirmDelete: (value: CounterpartyWithRow | null) => void
  ) => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید')

      return
    }
    if (!requireAuth()) return

    const itemName = getCounterpartyFullName(item)

    setSaving(true)
    try {
      await deleteCounterparty(settings.spreadsheetId, item.rowNumber)
      const next = await refreshList()

      if (value === itemName) {
        onChange(next[0] ? getCounterpartyFullName(next[0]) : '')
      }

      setConfirmDelete(null)
      showSuccess('طرف حساب حذف شد')
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در حذف طرف حساب' })
    } finally {
      setSaving(false)
    }
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید')

      return
    }
    if (!requireAuth()) return

    const next = reorderItems(counterparties, fromIndex, toIndex)

    setSaving(true)
    try {
      await reorderCounterparties(
        settings.spreadsheetId,
        next.map(item => item.id)
      )
      await refreshList()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره ترتیب طرف حساب‌ها' })
    } finally {
      setSaving(false)
    }
  }

  return { handleSubmitForm, handleDelete, handleReorder }
}
