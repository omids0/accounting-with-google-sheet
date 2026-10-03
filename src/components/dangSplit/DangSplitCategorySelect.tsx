import { useMemo } from 'react'

import type { DangSplitCategoryWithRow } from './types'
import { syncDangSplitCategoryTitles } from '../../services/dangSplitCategorySync'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import CategorySelect from '../form/CategorySelect'

/**
 * همان انتخابگر دسته‌بندی بقیه صفحه‌ها، روی دسته‌های افراد این گروه دنگ. مدیریت
 * (افزودن، تغییر نام، حذف) داخل همین شیت انجام می‌شود.
 */
export default function DangSplitCategorySelect({
  groupId,
  categories,
  value,
  onChange,
  onCategoriesSaved
}: {
  groupId: string
  categories: DangSplitCategoryWithRow[]
  value: string
  onChange: (categoryId: string) => void
  onCategoriesSaved: () => Promise<void> | void
}) {
  const titles = useMemo(() => categories.map(item => item.title), [categories])
  const selectedTitle = categories.find(item => item.id === value)?.title ?? ''

  return (
    <CategorySelect
      value={selectedTitle}
      onChange={title => {
        onChange(categories.find(item => item.title === title)?.id ?? '')
      }}
      categories={titles}
      allOption={{ value: '', label: 'بدون دسته' }}
      allowManage
      allowEmpty
      manageTitle="مدیریت دسته‌ها"
      placeholder="بدون دسته"
      aria-label="دسته فرد"
      onPersist={async next => {
        const spreadsheetId = requireSpreadsheetId()

        if (!spreadsheetId) return false

        try {
          await syncDangSplitCategoryTitles(spreadsheetId, {
            groupId,
            current: categories,
            nextTitles: next
          })
          await onCategoriesSaved()

          return true
        } catch (err) {
          handleSheetError(err, { fallbackMessage: 'ذخیره دسته‌ها ناموفق بود' })

          return false
        }
      }}
    />
  )
}
