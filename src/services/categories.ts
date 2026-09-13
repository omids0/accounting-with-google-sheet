import {
  applyGroupsToSettings,
  groupsToRows,
  rowsToGroups,
  withDefaults,
  type CategoryGroups
} from './categoryGroups'
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

export type { CategoryGroups, CategoryType } from './categoryGroups'

export const CATEGORIES_SHEET = 'دسته‌بندی‌ها'
export const CATEGORIES_HEADERS = ['نوع', 'دسته‌بندی']

export async function ensureCategoriesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, CATEGORIES_SHEET, CATEGORIES_HEADERS)
}

export async function fetchCategoriesFromSheet(spreadsheetId: string): Promise<CategoryGroups> {
  const rows = await fetchSheetRows(spreadsheetId, CATEGORIES_SHEET)

  return rowsToGroups(rows)
}

export async function saveCategoryGroupOnSheet(
  spreadsheetId: string,
  group: Partial<CategoryGroups>
): Promise<CategoryGroups> {
  const current = await fetchCategoriesFromSheet(spreadsheetId)
  const next = withDefaults({ ...current, ...group })

  await writeCategoriesToSheet(spreadsheetId, next)

  return next
}

async function writeCategoriesToSheet(
  spreadsheetId: string,
  groups: CategoryGroups
): Promise<void> {
  await ensureCategoriesSheet(spreadsheetId)
  await replaceSheetDataRows(
    spreadsheetId,
    CATEGORIES_SHEET,
    groupsToRows(groups),
    CATEGORIES_HEADERS.length,
    CATEGORIES_HEADERS
  )
}

export async function syncCategoriesFromSheet(spreadsheetId: string): Promise<CategoryGroups> {
  await ensureCategoriesSheet(spreadsheetId)

  const fromSheet = await fetchCategoriesFromSheet(spreadsheetId)

  const groups = withDefaults(fromSheet)

  const needsSeed =
    !fromSheet.income.length ||
    !fromSheet.expense.length ||
    !fromSheet.dang.length ||
    !fromSheet.receivable.length ||
    !fromSheet.personalReminder.length ||
    !fromSheet.vehiclePeriodic.length ||
    !fromSheet.vehicleMechanic.length

  if (needsSeed) {
    await writeCategoriesToSheet(spreadsheetId, groups)
  }

  applyGroupsToSettings(groups)

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

  const current = await fetchCategoriesFromSheet(spreadsheetId)

  const next: CategoryGroups = {
    ...withDefaults(current),
    [form.type]: categories
  }

  await writeCategoriesToSheet(spreadsheetId, next)
  updateFormCategories(formId, categories)
}

export async function saveDangCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  const current = await fetchCategoriesFromSheet(spreadsheetId)

  const next: CategoryGroups = {
    ...withDefaults(current),
    dang: categories
  }

  await writeCategoriesToSheet(spreadsheetId, next)
  updateDangCategories(categories)
}

export async function saveReceivableCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  const current = await fetchCategoriesFromSheet(spreadsheetId)

  const next: CategoryGroups = {
    ...withDefaults(current),
    receivable: categories
  }

  await writeCategoriesToSheet(spreadsheetId, next)
  updateReceivableCategories(categories)
}

export async function savePersonalReminderCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  const current = await fetchCategoriesFromSheet(spreadsheetId)

  const next: CategoryGroups = {
    ...withDefaults(current),
    personalReminder: categories
  }

  await writeCategoriesToSheet(spreadsheetId, next)
  updatePersonalReminderCategories(categories)
}

export function getPersonalReminderCategories(): string[] {
  const stored = getSettings()?.personalReminderCategories

  return stored?.length ? stored : [...DEFAULT_PERSONAL_REMINDER_CATEGORIES]
}
