import { renameSubcategoryOwner, setSubcategoriesOf } from './categorySubcategories'
import type { CategorySubcategoryMap } from '../types'
import { isOtherCategory, withoutOtherCategory } from '../utils/categoryOrdering'
import {
  getJalaliMonthKey,
  getJalaliMonthRange,
  listRecentJalaliMonthKeys
} from '../utils/dateRange'
import { isSystemCategory } from '../utils/protectedCategories'
import { normalizeSheetDate } from '../utils/sheetValues'

/**
 * Pure rules of the category page (round 6, D1): usage counts, the dimming rule, the
 * protected-category rules and the list/subcategory/budget side of a rename or merge.
 * The row rewrites themselves run in categoryRewrite.ts.
 */

/** The lists the category page manages. */
export type ManagedCategoryType = 'expense' | 'income' | 'dang' | 'receivable' | 'personalReminder'

/** A category with no record in this many months (current one included) is dimmed. */
export const DORMANT_MONTHS = 6

export interface CategoryUsage {
  thisMonth: number
  recent: number
  total: number
}

export interface CategoryUsageSummary {
  byCategory: Map<string, CategoryUsage>
  /** Some row is older than the dimming window: there is enough history to judge. */
  hasOlderHistory: boolean
}

const NO_USAGE: CategoryUsage = { thisMonth: 0, recent: 0, total: 0 }

/** Counts per category; rows without a date count toward the total only. */
export function summarizeCategoryUsage(
  rows: { category: string; date?: string }[],
  todayIso: string
): CategoryUsageSummary {
  const monthKey = getJalaliMonthKey(todayIso)
  const month = getJalaliMonthRange(monthKey)
  const windowStart = getJalaliMonthRange(listRecentJalaliMonthKeys(monthKey, DORMANT_MONTHS)[0])
  const byCategory = new Map<string, CategoryUsage>()
  let hasOlderHistory = false

  for (const row of rows) {
    const name = row.category.trim() || 'سایر'
    const usage = { ...(byCategory.get(name) ?? NO_USAGE) }
    const date = normalizeSheetDate(row.date ?? '')

    usage.total += 1
    if (date && windowStart && date >= windowStart.start) usage.recent += 1
    if (date && windowStart && date < windowStart.start) hasOlderHistory = true
    if (date && month && date >= month.start && date <= month.end) usage.thisMonth += 1
    byCategory.set(name, usage)
  }

  return { byCategory, hasOlderHistory }
}

export function usageOf(summary: CategoryUsageSummary, category: string): CategoryUsage {
  return summary.byCategory.get(category.trim()) ?? NO_USAGE
}

/** «سیستمی» categories and «سایر» keep their name and cannot be deleted. */
export function isFixedCategory(type: ManagedCategoryType, category: string): boolean {
  return isOtherCategory(category) || isSystemCategory(type, category)
}

/**
 * «ادغام یا حذف؟»: an income/expense category unused for DORMANT_MONTHS — only once the
 * spreadsheet has older rows, so a newcomer's untouched defaults are not all dimmed.
 */
export function isDormantCategory(
  type: ManagedCategoryType,
  category: string,
  summary: CategoryUsageSummary
): boolean {
  if (type !== 'income' && type !== 'expense') return false
  if (isFixedCategory(type, category) || !summary.hasOlderHistory) return false

  return usageOf(summary, category).recent === 0
}

/** Why `next` cannot become a category name; null when it can. */
export function categoryNameError(categories: string[], current: string, next: string) {
  const name = next.trim()

  if (!name) return 'نام دسته را بنویس'
  if (name !== current && categories.some(item => item.trim() === name)) {
    return 'این دسته قبلاً وجود دارد'
  }

  return null
}

export interface CategoryListChange {
  categories: string[]
  subcategories: CategorySubcategoryMap
}

export function planCategoryRename(
  type: ManagedCategoryType,
  categories: string[],
  map: CategorySubcategoryMap,
  from: string,
  to: string
): CategoryListChange {
  return {
    categories: categories.map(item => (item === from ? to.trim() : item)),
    subcategories: renameSubcategoryOwner(map, type, from, to.trim())
  }
}

/** The target keeps its subcategories and gains the source's, so merged rows stay valid. */
export function planCategoryMerge(
  type: ManagedCategoryType,
  categories: string[],
  map: CategorySubcategoryMap,
  from: string,
  to: string
): CategoryListChange {
  const target = map[type]?.[to] ?? []
  const source = map[type]?.[from] ?? []
  const merged = withoutOtherCategory([...target, ...source.filter(sub => !target.includes(sub))])
  const withTarget = setSubcategoriesOf(map, type, to, merged)

  return {
    categories: categories.filter(item => item !== from),
    subcategories: setSubcategoriesOf(withTarget, type, from, [])
  }
}

export function planCategoryDelete(
  type: ManagedCategoryType,
  categories: string[],
  map: CategorySubcategoryMap,
  category: string
): CategoryListChange {
  return {
    categories: categories.filter(item => item !== category),
    subcategories: setSubcategoriesOf(map, type, category, [])
  }
}

export type BudgetChange =
  | { kind: 'none' }
  | { kind: 'move'; from: string; to: string; amount: number }
  | { kind: 'delete'; category: string }

/**
 * A rename carries the budget over; a merge or delete drops the source's budget (the
 * target keeps its own) — unless a rename lands on a name that already has one.
 */
export function planBudgetChange(
  op: 'rename' | 'merge' | 'delete',
  budgets: Map<string, number>,
  from: string,
  to = ''
): BudgetChange {
  const amount = budgets.get(from)

  if (!amount) return { kind: 'none' }
  if (op === 'rename' && !budgets.has(to)) return { kind: 'move', from, to, amount }

  return { kind: 'delete', category: from }
}

export interface CategoryRewriteTarget {
  category: string
  /** Set: only rows of this subcategory, and it is rewritten too. */
  subCategory?: string
}

/** The row's new category and subcategory, or null when the row is not affected. */
export function rewriteCategoryValues(
  values: { category?: string; subCategory?: string },
  from: CategoryRewriteTarget,
  to: CategoryRewriteTarget
): { category: string; subCategory: string } | null {
  const category = (values.category ?? '').trim()
  const subCategory = (values.subCategory ?? '').trim()

  if (category !== from.category) return null
  if (from.subCategory !== undefined && subCategory !== from.subCategory) return null

  return {
    category: to.category,
    subCategory: from.subCategory !== undefined ? to.subCategory ?? '' : values.subCategory ?? ''
  }
}
