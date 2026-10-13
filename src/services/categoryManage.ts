import { logItemActivity } from './activityLog'
import { budgetMap } from './budgets'
import { deleteBudget, fetchBudgets, saveBudget } from './budgetsSheet'
import {
  getPersonalReminderCategories,
  saveCategoryListToSheet,
  saveSubcategoriesToSheet
} from './categories'
import { appendMissingDefaults, closeDefaultsOffer } from './categoryDefaults'
import {
  isFixedCategory,
  planBudgetChange,
  planCategoryDelete,
  planCategoryMerge,
  planCategoryRename,
  type BudgetChange,
  type CategoryListChange,
  type ManagedCategoryType
} from './categoryManagePlan'
import {
  collectCategoryRewrites,
  liveRewriteOptions,
  runRewriteTasks,
  type RewriteProgress
} from './categoryRewrite'
import { getCategorySubcategories, getSubcategoriesOf } from './categorySubcategories'
import { getDangCategories, getReceivableCategories, getSettings } from './settings'
import { withOtherLast } from '../utils/categoryOrdering'

/** Category page actions (round 6, D1): rows first, then the list, then the budget. */

type ProgressFn = (progress: RewriteProgress) => void

export function readCategoryList(type: ManagedCategoryType): string[] {
  if (type === 'dang') return getDangCategories()
  if (type === 'receivable') return getReceivableCategories()
  if (type === 'personalReminder') return getPersonalReminderCategories()

  const form = getSettings()?.forms.find(item => item.type === type)

  return form?.fields.find(field => field.id === 'category')?.options ?? []
}

async function saveChange(
  spreadsheetId: string,
  type: ManagedCategoryType,
  change: CategoryListChange
) {
  await saveCategoryListToSheet(spreadsheetId, type, change.categories, change.subcategories)
}

async function applyBudgetChange(spreadsheetId: string, change: BudgetChange): Promise<void> {
  if (change.kind === 'move') {
    await saveBudget(spreadsheetId, change.to, change.amount)
    await deleteBudget(spreadsheetId, change.from)
  } else if (change.kind === 'delete') {
    await deleteBudget(spreadsheetId, change.category)
  }
}

function logCategory(
  spreadsheetId: string,
  category: string,
  extra: { kind: 'add' | 'rename' | 'merge' | 'delete'; to?: string }
): void {
  logItemActivity(spreadsheetId, 'category', 'categories', category, category, extra)
}

async function budgetsOf(spreadsheetId: string, type: ManagedCategoryType) {
  return type === 'expense'
    ? budgetMap(await fetchBudgets(spreadsheetId))
    : new Map<string, number>()
}

function assertEditable(type: ManagedCategoryType, category: string): void {
  if (isFixedCategory(type, category)) throw new Error('این دسته سیستمی است و تغییر نمی‌کند')
}

/** Rows of the list's ledger under `category` (the «۳۱ رکورد» of the merge confirm). */
export async function countCategoryRows(
  spreadsheetId: string,
  type: ManagedCategoryType,
  category: string
): Promise<number> {
  return (await collectCategoryRewrites(spreadsheetId, type, { category }, { category })).length
}

async function moveRows(
  spreadsheetId: string,
  type: ManagedCategoryType,
  from: string,
  to: string,
  onProgress?: ProgressFn
): Promise<void> {
  const tasks = await collectCategoryRewrites(
    spreadsheetId,
    type,
    { category: from },
    { category: to }
  )

  await runRewriteTasks(tasks, liveRewriteOptions(spreadsheetId, onProgress))
}

export async function renameCategory(
  spreadsheetId: string,
  type: ManagedCategoryType,
  from: string,
  to: string,
  onProgress?: ProgressFn
): Promise<void> {
  assertEditable(type, from)

  const budgets = await budgetsOf(spreadsheetId, type)

  await moveRows(spreadsheetId, type, from, to.trim(), onProgress)
  await saveChange(
    spreadsheetId,
    type,
    planCategoryRename(type, readCategoryList(type), getCategorySubcategories(), from, to)
  )
  await applyBudgetChange(spreadsheetId, planBudgetChange('rename', budgets, from, to.trim()))
  logCategory(spreadsheetId, from, { kind: 'rename', to: to.trim() })
}

export async function mergeCategory(
  spreadsheetId: string,
  type: ManagedCategoryType,
  from: string,
  to: string,
  onProgress?: ProgressFn
): Promise<void> {
  assertEditable(type, from)

  const budgets = await budgetsOf(spreadsheetId, type)

  await moveRows(spreadsheetId, type, from, to, onProgress)
  await saveChange(
    spreadsheetId,
    type,
    planCategoryMerge(type, readCategoryList(type), getCategorySubcategories(), from, to)
  )
  await applyBudgetChange(spreadsheetId, planBudgetChange('merge', budgets, from, to))
  logCategory(spreadsheetId, from, { kind: 'merge', to })
}

/** Only an unused category is deleted outright; one with rows goes through a merge. */
export async function deleteCategory(
  spreadsheetId: string,
  type: ManagedCategoryType,
  category: string
): Promise<void> {
  assertEditable(type, category)
  if (await countCategoryRows(spreadsheetId, type, category)) {
    throw new Error('این دسته رکورد دارد؛ اول آن را در دسته دیگری ادغام کن')
  }

  const budgets = await budgetsOf(spreadsheetId, type)

  await saveChange(
    spreadsheetId,
    type,
    planCategoryDelete(type, readCategoryList(type), getCategorySubcategories(), category)
  )
  await applyBudgetChange(spreadsheetId, planBudgetChange('delete', budgets, category))
  logCategory(spreadsheetId, category, { kind: 'delete' })
}

export async function addCategory(
  spreadsheetId: string,
  type: ManagedCategoryType,
  name: string
): Promise<void> {
  await saveCategoryListToSheet(
    spreadsheetId,
    type,
    withOtherLast([...readCategoryList(type), name])
  )
  logCategory(spreadsheetId, name, { kind: 'add' })
}

export async function saveCategoryOrder(
  spreadsheetId: string,
  type: ManagedCategoryType,
  categories: string[]
): Promise<void> {
  await saveCategoryListToSheet(spreadsheetId, type, categories)
}

export function readSubcategoryList(type: ManagedCategoryType, category: string): string[] {
  return getSubcategoriesOf(getCategorySubcategories(), type, category)
}

/** Adds or removes subcategories; rows keep the value they were saved with. */
export async function saveSubcategoryList(
  spreadsheetId: string,
  type: ManagedCategoryType,
  category: string,
  subcategories: string[]
): Promise<void> {
  await saveSubcategoriesToSheet(spreadsheetId, type, category, subcategories)
}

/** A subcategory rename rewrites the rows that carry it, then the list. */
export async function renameSubcategory(
  spreadsheetId: string,
  type: ManagedCategoryType,
  category: string,
  from: string,
  to: string,
  onProgress?: ProgressFn
): Promise<void> {
  const tasks = await collectCategoryRewrites(
    spreadsheetId,
    type,
    { category, subCategory: from },
    { category, subCategory: to.trim() }
  )

  await runRewriteTasks(tasks, liveRewriteOptions(spreadsheetId, onProgress))

  const next = readSubcategoryList(type, category).map(item => (item === from ? to.trim() : item))

  await saveSubcategoryList(spreadsheetId, type, category, next)
}

/** «دسته‌های پیشنهادی جدید را اضافه کنم؟»: appends what is missing, then closes the offer. */
export async function addMissingDefaultCategories(spreadsheetId: string): Promise<number> {
  let added = 0

  for (const type of ['expense', 'income'] as const) {
    const result = appendMissingDefaults(type, readCategoryList(type), getCategorySubcategories())

    if (!result.added.length) continue
    await saveCategoryListToSheet(spreadsheetId, type, result.categories, result.subcategories)
    added += result.added.length
  }

  closeDefaultsOffer(spreadsheetId)

  return added
}
