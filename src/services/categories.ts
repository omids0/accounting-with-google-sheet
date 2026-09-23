import {
  applyGroupsToSettings,
  groupsToRows,
  rowsToGroups,
  rowsToSubcategories,
  withDefaults,
  type CategoryGroups,
  type CategoryType
} from './categoryGroups'
import {
  removeSubcategoryOwner,
  renameSubcategoryOwner,
  setSubcategoriesOf,
  updateCategorySubcategories
} from './categorySubcategories'
import {
  DEFAULT_PERSONAL_REMINDER_CATEGORIES,
  getDefaultSettings,
  getSettings,
  updateDangCategories,
  updateFormCategories,
  updatePersonalReminderCategories,
  updateReceivableCategories
} from './settings'
import { ensureSheetWithHeaders, fetchSheetRows, replaceSheetDataRows } from './sheets'
import type { CategorySubcategoryMap } from '../types'
import { withLockedFormCategories } from '../utils/protectedCategories'

export type { CategoryGroups, CategoryType } from './categoryGroups'

export const CATEGORIES_SHEET = 'دسته‌بندی‌ها'
export const CATEGORIES_HEADERS = ['نوع', 'دسته‌بندی', 'زیردسته']

export async function ensureCategoriesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, CATEGORIES_SHEET, CATEGORIES_HEADERS)
}

export interface CategorySheetData {
  groups: CategoryGroups
  subcategories: CategorySubcategoryMap
}

export async function fetchCategorySheetData(spreadsheetId: string): Promise<CategorySheetData> {
  const rows = await fetchSheetRows(spreadsheetId, CATEGORIES_SHEET)

  return { groups: rowsToGroups(rows), subcategories: rowsToSubcategories(rows) }
}

export async function saveCategoryGroupOnSheet(
  spreadsheetId: string,
  group: Partial<CategoryGroups>
): Promise<CategoryGroups> {
  const current = await fetchCategorySheetData(spreadsheetId)
  const next = withDefaults({ ...current.groups, ...group })

  await writeCategoriesToSheet(spreadsheetId, next, current.subcategories)

  return next
}

export async function saveSubcategoriesToSheet(
  spreadsheetId: string,
  categoryType: CategoryType,
  category: string,
  subcategories: string[]
): Promise<CategorySubcategoryMap> {
  const current = await fetchCategorySheetData(spreadsheetId)
  const next = setSubcategoriesOf(current.subcategories, categoryType, category, subcategories)

  await writeCategoriesToSheet(spreadsheetId, withDefaults(current.groups), next)
  updateCategorySubcategories(next)

  return next
}

export async function renameSubcategoryOwnerOnSheet(
  spreadsheetId: string,
  categoryType: CategoryType,
  oldName: string,
  newName: string
): Promise<void> {
  const current = await fetchCategorySheetData(spreadsheetId)

  if (!current.subcategories[categoryType]?.[oldName]?.length) return

  const next = renameSubcategoryOwner(current.subcategories, categoryType, oldName, newName)

  await writeCategoriesToSheet(spreadsheetId, withDefaults(current.groups), next)
  updateCategorySubcategories(next)
}

export async function removeSubcategoryOwnerOnSheet(
  spreadsheetId: string,
  categoryType: CategoryType,
  category: string
): Promise<void> {
  const current = await fetchCategorySheetData(spreadsheetId)

  if (!current.subcategories[categoryType]?.[category]?.length) return

  const next = removeSubcategoryOwner(current.subcategories, categoryType, category)

  await writeCategoriesToSheet(spreadsheetId, withDefaults(current.groups), next)
  updateCategorySubcategories(next)
}

async function writeCategoriesToSheet(
  spreadsheetId: string,
  groups: CategoryGroups,
  subcategories: CategorySubcategoryMap
): Promise<void> {
  await ensureCategoriesSheet(spreadsheetId)
  await replaceSheetDataRows(
    spreadsheetId,
    CATEGORIES_SHEET,
    groupsToRows(groups, subcategories),
    CATEGORIES_HEADERS.length,
    CATEGORIES_HEADERS
  )
}

export async function syncCategoriesFromSheet(spreadsheetId: string): Promise<CategoryGroups> {
  await ensureCategoriesSheet(spreadsheetId)

  const { groups: fromSheet, subcategories } = await fetchCategorySheetData(spreadsheetId)

  const groups = withDefaults(fromSheet)

  const needsSeed =
    !fromSheet.income.length ||
    !fromSheet.expense.length ||
    !fromSheet.dang.length ||
    !fromSheet.receivable.length ||
    !fromSheet.personalReminder.length ||
    !fromSheet.vehiclePeriodic.length ||
    !fromSheet.vehicleDeadline.length ||
    !fromSheet.vehicleMechanic.length ||
    !fromSheet.vehicleExpense.length ||
    !fromSheet.walletBank.length ||
    !fromSheet.walletAccountKind.length

  if (needsSeed) {
    await writeCategoriesToSheet(spreadsheetId, groups, subcategories)
  }

  applyGroupsToSettings(groups, subcategories)

  const { ensureVehicleExpenseCategory } = await import('./vehicleExpenses')

  await ensureVehicleExpenseCategory()

  return groups
}

export async function saveFormCategoriesToSheet(
  spreadsheetId: string,
  formId: string,
  categories: string[]
): Promise<void> {
  const settings = getSettings() ?? getDefaultSettings()

  const form = settings.forms.find(item => item.id === formId)

  if (!form || (form.type !== 'income' && form.type !== 'expense')) {
    throw new Error('فرم دسته‌بندی معتبر نیست')
  }

  const current = await fetchCategorySheetData(spreadsheetId)
  const normalized = withLockedFormCategories(form.type, categories)

  const next: CategoryGroups = {
    ...withDefaults(current.groups),
    [form.type]: normalized
  }

  await writeCategoriesToSheet(spreadsheetId, next, current.subcategories)
  updateFormCategories(formId, normalized)
}

export async function saveDangCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  const current = await fetchCategorySheetData(spreadsheetId)

  const next: CategoryGroups = {
    ...withDefaults(current.groups),
    dang: categories
  }

  await writeCategoriesToSheet(spreadsheetId, next, current.subcategories)
  updateDangCategories(categories)
}

export async function saveReceivableCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  const current = await fetchCategorySheetData(spreadsheetId)

  const next: CategoryGroups = {
    ...withDefaults(current.groups),
    receivable: categories
  }

  await writeCategoriesToSheet(spreadsheetId, next, current.subcategories)
  updateReceivableCategories(categories)
}

export async function savePersonalReminderCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  const current = await fetchCategorySheetData(spreadsheetId)

  const next: CategoryGroups = {
    ...withDefaults(current.groups),
    personalReminder: categories
  }

  await writeCategoriesToSheet(spreadsheetId, next, current.subcategories)
  updatePersonalReminderCategories(categories)
}

export function getPersonalReminderCategories(): string[] {
  const stored = getSettings()?.personalReminderCategories

  return stored?.length ? stored : [...DEFAULT_PERSONAL_REMINDER_CATEGORIES]
}
