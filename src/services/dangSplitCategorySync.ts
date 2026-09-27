import { deleteDangSplitCategoryCascade } from './dangSplitBundle'
import {
  createDangSplitCategory,
  updateDangSplitCategory,
  type DangSplitCategoryWithRow
} from './dangSplitPeople'

/**
 * هم‌ترازکردن لیست دسته‌ها با عنوان‌هایی که کاربر در مدیریت دسته‌ها ساخته است.
 * یک حذف و یک افزودن هم‌زمان یعنی تغییر نام، نه حذف و ساخت دوباره.
 */
export async function syncDangSplitCategoryTitles(
  spreadsheetId: string,
  {
    groupId,
    current,
    nextTitles
  }: {
    groupId: string
    current: DangSplitCategoryWithRow[]
    nextTitles: string[]
  }
): Promise<void> {
  const titles = nextTitles.map(title => title.trim()).filter(Boolean)
  const removed = current.filter(item => !titles.includes(item.title))
  const added = titles.filter(title => !current.some(item => item.title === title))

  if (removed.length === 1 && added.length === 1) {
    await updateDangSplitCategory(spreadsheetId, removed[0].rowNumber, {
      ...removed[0],
      title: added[0]
    })

    return
  }

  for (const title of added) {
    await createDangSplitCategory(spreadsheetId, { groupId, title })
  }

  // حذف‌ها از آخرین ردیف به اولی انجام می‌شود تا شماره ردیف بقیه جابه‌جا نشود.
  for (const item of [...removed].sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteDangSplitCategoryCascade(spreadsheetId, item)
  }
}
