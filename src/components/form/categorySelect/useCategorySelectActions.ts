import type { CategoryType } from '../../../services/categories'
import {
  removeSubcategoryOwnerOnSheet,
  renameSubcategoryOwnerOnSheet,
  saveDangCategoriesToSheet,
  saveFormCategoriesToSheet,
  savePersonalReminderCategoriesToSheet,
  saveReceivableCategoriesToSheet
} from '../../../services/categories'
import { getSettings } from '../../../services/settings'
import { saveVehicleDeadlineCategoriesToSheet } from '../../../services/vehicleDeadlineCategories'
import { saveVehicleExpenseCategoriesToSheet } from '../../../services/vehicleExpenseCategories'
import { saveVehicleMechanicCategoriesToSheet } from '../../../services/vehicleMechanicCategories'
import { saveVehiclePeriodicCategoriesToSheet } from '../../../services/vehiclePeriodicCategories'
import {
  saveWalletAccountKindCategoriesToSheet,
  saveWalletBankCategoriesToSheet
} from '../../../services/walletCategories'
import { requireAuth } from '../../../utils/authGuard'
import {
  isOtherCategory,
  reorderWithOtherLast,
  withOtherLast
} from '../../../utils/categoryOrdering'
import { handleSheetError } from '../../../utils/sheetError'
import { showError, showSuccess } from '../../../utils/toast'

export interface CategorySelectAllOption {
  value: string
  label: string
}

export interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  formId?: string
  categoryScope?: CategoryType
  onCategoriesChange?: (categories: string[]) => void
  disabled?: boolean
  'aria-label'?: string
  id?: string
  invalid?: boolean
  className?: string
  placeholder?: string
  allOption?: CategorySelectAllOption
  allowManage?: boolean
  showSearchAlways?: boolean
  lockedCategories?: string[]
  /** Overrides where the edited list is saved. Used for subcategory lists. */
  onPersist?: (next: string[]) => Promise<boolean>
  allowEmpty?: boolean
  manageTitle?: string
  /** Lets each category in manage mode drill down into its own subcategories. */
  allowSubcategories?: boolean
}

/** The category type a list belongs to, used to look up and store its subcategories. */
export function resolveCategoryType(
  categoryScope?: CategoryType,
  formId?: string
): CategoryType | undefined {
  if (categoryScope) return categoryScope

  const formType = formId ? getSettings()?.forms.find(form => form.id === formId)?.type : undefined

  return formType === 'income' || formType === 'expense' ? formType : undefined
}

export function useCategorySelectActions({
  categories,
  formId,
  categoryScope,
  onCategoriesChange,
  onChange,
  value,
  setSaving,
  lockedCategories = [],
  onPersist,
  allowEmpty = false
}: {
  categories: string[]
  formId?: string
  categoryScope?: CategoryType
  onCategoriesChange?: (categories: string[]) => void
  onChange: (value: string) => void
  value: string
  setSaving: (saving: boolean) => void
  lockedCategories?: string[]
  onPersist?: (next: string[]) => Promise<boolean>
  allowEmpty?: boolean
}) {
  const lockedSet = new Set(lockedCategories)
  const persistCategories = async (
    next: string[],
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید')

      return false
    }
    if (!requireAuth()) return false
    if (!allowEmpty && !next.length) {
      showError('حداقل یک دسته‌بندی لازم است')

      return false
    }

    setSaving(true)
    try {
      if (onPersist) {
        if (!(await onPersist(next))) return false
      } else if (categoryScope === 'dang') {
        await saveDangCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'receivable') {
        await saveReceivableCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'personalReminder') {
        await savePersonalReminderCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'vehiclePeriodic') {
        await saveVehiclePeriodicCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'vehicleDeadline') {
        await saveVehicleDeadlineCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'vehicleMechanic') {
        await saveVehicleMechanicCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'vehicleExpense') {
        await saveVehicleExpenseCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'walletBank') {
        await saveWalletBankCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'walletAccountKind') {
        await saveWalletAccountKindCategoriesToSheet(settings.spreadsheetId, next)
      } else {
        if (!formId) {
          showError('فرم دسته‌بندی معتبر نیست')

          return false
        }
        await saveFormCategoriesToSheet(settings.spreadsheetId, formId, next)
      }
      onCategoriesChange?.(next)
      if (!options?.silent) {
        showSuccess('دسته‌بندی‌ها ذخیره شد')
      }

      return true
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره دسته‌بندی‌ها' })

      return false
    } finally {
      setSaving(false)
    }
  }

  const isLockedCategory = (name: string): boolean => lockedSet.has(name) || isOtherCategory(name)

  const syncSubcategoryOwner = async (oldName: string, newName: string | null): Promise<void> => {
    const ownerType = onPersist ? undefined : resolveCategoryType(categoryScope, formId)

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!ownerType || !spreadsheetId) return

    if (newName === null) {
      await removeSubcategoryOwnerOnSheet(spreadsheetId, ownerType, oldName)

      return
    }

    await renameSubcategoryOwnerOnSheet(spreadsheetId, ownerType, oldName, newName)
  }

  const handleSaveEdit = async (
    oldName: string,
    editText: string,
    cancelEdit: () => void
  ): Promise<void> => {
    if (isLockedCategory(oldName)) {
      showError('این دسته‌بندی قابل ویرایش نیست')

      return
    }

    const name = editText.trim()

    if (!name) {
      showError('نام دسته‌بندی خالی است')

      return
    }
    if (name === oldName) {
      cancelEdit()

      return
    }
    if (categories.includes(name)) {
      showError('این دسته‌بندی قبلاً وجود دارد')

      return
    }

    const next = categories.map(item => (item === oldName ? name : item))

    if (await persistCategories(next)) {
      await syncSubcategoryOwner(oldName, name)
      if (value === oldName) onChange(name)
      cancelEdit()
    }
  }

  const handleDelete = async (category: string, setConfirmDelete: (v: string | null) => void) => {
    if (isLockedCategory(category)) {
      showError('این دسته‌بندی قابل حذف نیست')

      return
    }

    if (!allowEmpty && categories.length <= 1) {
      showError('حداقل یک دسته‌بندی باید بماند')

      return
    }

    const next = categories.filter(item => item !== category)

    if (await persistCategories(next)) {
      await syncSubcategoryOwner(category, null)
      if (value === category) onChange(next[0] ?? '')
      setConfirmDelete(null)
    }
  }

  const handleAdd = async (
    newCategory: string,
    setNewCategory: (v: string) => void,
    setSearchQuery: (v: string) => void
  ) => {
    const name = newCategory.trim()

    if (!name) return
    if (categories.includes(name)) {
      showError('این دسته‌بندی قبلاً وجود دارد')

      return
    }

    const next = withOtherLast([...categories, name])

    if (await persistCategories(next)) {
      setNewCategory('')
      onChange(name)
      setSearchQuery('')
    }
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const next = reorderWithOtherLast(categories, fromIndex, toIndex)

    if (next === categories) return

    await persistCategories(next, { silent: true })
  }

  return { handleSaveEdit, handleDelete, handleAdd, handleReorder }
}
