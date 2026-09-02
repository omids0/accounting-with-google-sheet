import { isTokenValid } from '../../../services/auth'
import type { CategoryType } from '../../../services/categories'
import {
  saveDangCategoriesToSheet,
  saveFormCategoriesToSheet,
  saveReceivableCategoriesToSheet
} from '../../../services/categories'
import { getSettings } from '../../../services/settings'
import { handleSheetError } from '../../../utils/sheetError'
import { showError, showSuccess } from '../../../utils/toast'

export interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  formId?: string
  categoryScope?: CategoryType
  onCategoriesChange?: (categories: string[]) => void
  onReauth?: () => void
  disabled?: boolean
  'aria-label'?: string
  id?: string
}

export function useCategorySelectActions({
  categories,
  formId,
  categoryScope,
  onCategoriesChange,
  onReauth,
  onChange,
  value,
  setSaving
}: {
  categories: string[]
  formId?: string
  categoryScope?: CategoryType
  onCategoriesChange?: (categories: string[]) => void
  onReauth?: () => void
  onChange: (value: string) => void
  value: string
  setSaving: (saving: boolean) => void
}) {
  const persistCategories = async (next: string[]): Promise<boolean> => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید')

      return false
    }
    if (!isTokenValid()) {
      onReauth?.()

      return false
    }
    if (!next.length) {
      showError('حداقل یک دسته‌بندی لازم است')

      return false
    }

    setSaving(true)
    try {
      if (categoryScope === 'dang') {
        await saveDangCategoriesToSheet(settings.spreadsheetId, next)
      } else if (categoryScope === 'receivable') {
        await saveReceivableCategoriesToSheet(settings.spreadsheetId, next)
      } else {
        if (!formId) {
          showError('فرم دسته‌بندی معتبر نیست')

          return false
        }
        await saveFormCategoriesToSheet(settings.spreadsheetId, formId, next)
      }
      onCategoriesChange?.(next)
      showSuccess('دسته‌بندی‌ها ذخیره شد')

      return true
    } catch (err) {
      handleSheetError(err, { onReauth, fallbackMessage: 'خطا در ذخیره دسته‌بندی‌ها' })

      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async (
    oldName: string,
    editText: string,
    cancelEdit: () => void
  ): Promise<void> => {
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
      if (value === oldName) onChange(name)
      cancelEdit()
    }
  }

  const handleDelete = async (category: string, setConfirmDelete: (v: string | null) => void) => {
    if (categories.length <= 1) {
      showError('حداقل یک دسته‌بندی باید بماند')

      return
    }

    const next = categories.filter(item => item !== category)

    if (await persistCategories(next)) {
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

    const next = [...categories, name]

    if (await persistCategories(next)) {
      setNewCategory('')
      onChange(name)
      setSearchQuery('')
    }
  }

  return { handleSaveEdit, handleDelete, handleAdd }
}
