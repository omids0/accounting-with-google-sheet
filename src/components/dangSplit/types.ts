import type { DangSplitGroupWithRow } from '../../services/dangSplit'
import type { DangSplitExpenseWithRow } from '../../services/dangSplitExpenses'
import type {
  DangSplitCategoryWithRow,
  DangSplitPersonWithRow
} from '../../services/dangSplitPeople'
import type { DangSplitGroupSummary } from '../../types/dangSplit'

export type {
  DangSplitGroupWithRow,
  DangSplitExpenseWithRow,
  DangSplitCategoryWithRow,
  DangSplitPersonWithRow
}

export type DangSplitDetailTab = 'summary' | 'people' | 'expenses'

export type DangSplitGroupFormState = {
  title: string
  description: string
}

export type DangSplitPersonFormState = {
  name: string
  categoryId: string
  defaultWeight: number | ''
  note: string
}

export type DangSplitCategoryFormState = {
  title: string
}

export type DangSplitExpenseFormState = {
  title: string
  date: string
  amount: number | ''
  note: string
}

/** یک گروه همراه جمع‌بندی محاسبه‌شده‌اش، برای کارت‌های صفحه لیست */
export type DangSplitGroupListItem = DangSplitGroupWithRow & {
  summary: DangSplitGroupSummary
}
