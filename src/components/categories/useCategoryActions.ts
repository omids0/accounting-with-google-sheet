import { useCallback, useState } from 'react'

import {
  addCategory,
  addMissingDefaultCategories,
  deleteCategory,
  mergeCategory,
  renameCategory,
  renameSubcategory,
  saveCategoryOrder,
  saveSubcategoryList
} from '../../services/categoryManage'
import type { ManagedCategoryType } from '../../services/categoryManagePlan'
import { CategoryRewriteAbortedError, type RewriteProgress } from '../../services/categoryRewrite'
import { requireAuth } from '../../utils/authGuard'
import { formatPersianNumber } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

type Task = (onProgress: (progress: RewriteProgress) => void) => Promise<void>

/** Every write of the category page: one at a time, with row progress and a clean abort. */
export function useCategoryActions(spreadsheetId: string, type: ManagedCategoryType) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<RewriteProgress | null>(null)

  const run = useCallback(
    async (task: Task, done?: string): Promise<boolean> => {
      if (!spreadsheetId) {
        showError('ابتدا شیت فعال را انتخاب کنید')

        return false
      }
      if (!requireAuth()) return false

      setBusy(true)
      try {
        await task(setProgress)
        if (done) showSuccess(done)

        return true
      } catch (err) {
        if (err instanceof CategoryRewriteAbortedError) {
          showError(
            `کار نیمه‌کاره ماند (${formatPersianNumber(err.done)} از ${formatPersianNumber(
              err.total
            )} رکورد). دوباره وارد شو و همین کار را تکرار کن.`
          )
        }
        handleSheetError(err, { fallbackMessage: 'خطا در ذخیره دسته‌ها' })

        return false
      } finally {
        setBusy(false)
        setProgress(null)
      }
    },
    [spreadsheetId]
  )

  return {
    busy,
    progress,
    add: (name: string) => run(() => addCategory(spreadsheetId, type, name), 'دسته اضافه شد'),
    reorder: (categories: string[]) =>
      run(() => saveCategoryOrder(spreadsheetId, type, categories)),
    rename: (from: string, to: string) =>
      run(report => renameCategory(spreadsheetId, type, from, to, report), 'نام دسته عوض شد'),
    merge: (from: string, to: string) =>
      run(
        report => mergeCategory(spreadsheetId, type, from, to, report),
        `«${from}» در «${to}» ادغام شد`
      ),
    remove: (name: string) => run(() => deleteCategory(spreadsheetId, type, name), 'دسته حذف شد'),
    saveSubcategories: (category: string, list: string[]) =>
      run(() => saveSubcategoryList(spreadsheetId, type, category, list)),
    renameSubcategory: (category: string, from: string, to: string) =>
      run(
        report => renameSubcategory(spreadsheetId, type, category, from, to, report),
        'نام زیردسته عوض شد'
      ),
    addDefaults: () =>
      run(async () => {
        const added = await addMissingDefaultCategories(spreadsheetId)

        showSuccess(`${formatPersianNumber(added)} دسته پیشنهادی اضافه شد`)
      })
  }
}
