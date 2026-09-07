import {
  DEFAULT_DANG_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PERSONAL_REMINDER_CATEGORIES,
  DEFAULT_RECEIVABLE_CATEGORIES,
  getDefaultSettings,
  getSettings,
  saveSettings,
  updateDangCategories,
  updateFormCategories,
  updatePersonalReminderCategories,
  updateReceivableCategories
} from './settings'
import { ensureSheetWithHeaders, fetchSheetRows, replaceSheetDataRows } from './sheets'

export const CATEGORIES_SHEET = 'دسته‌بندی‌ها'
export const CATEGORIES_HEADERS = ['نوع', 'دسته‌بندی']

export type CategoryType = 'income' | 'expense' | 'dang' | 'receivable' | 'personalReminder'

const FORM_TYPE_LABELS: Record<CategoryType, string> = {
  income: 'درآمد',
  expense: 'هزینه',
  dang: 'بدهی',
  receivable: 'طلب',
  personalReminder: 'یادآوری'
}

export interface CategoryGroups {
  income: string[]
  expense: string[]
  dang: string[]
  receivable: string[]
  personalReminder: string[]
}

function parseFormType(value: string): CategoryType | null {
  const normalized = value.trim().toLowerCase()

  if (normalized === 'income' || normalized === 'درآمد') return 'income'
  if (normalized === 'expense' || normalized === 'هزینه') return 'expense'
  if (normalized === 'dang' || normalized === 'بدهی' || normalized === 'دنگ') {
    return 'dang'
  }
  if (normalized === 'receivable' || normalized === 'طلب') {
    return 'receivable'
  }
  if (
    normalized === 'personalreminder' ||
    normalized === 'personal_reminder' ||
    normalized === 'یادآوری' ||
    normalized === 'موعد شخصی'
  ) {
    return 'personalReminder'
  }

  return null
}

function rowsToGroups(rows: string[][]): CategoryGroups {
  const groups: CategoryGroups = {
    income: [],
    expense: [],
    dang: [],
    receivable: [],
    personalReminder: []
  }

  for (const row of rows) {
    const formType = parseFormType(row[0] ?? '')

    const category = String(row[1] ?? '').trim()

    if (!formType || !category) continue
    if (!groups[formType].includes(category)) {
      groups[formType].push(category)
    }
  }

  return groups
}

function groupsToRows(groups: CategoryGroups): string[][] {
  const rows: string[][] = []

  for (const category of groups.income) {
    rows.push([FORM_TYPE_LABELS.income, category])
  }
  for (const category of groups.expense) {
    rows.push([FORM_TYPE_LABELS.expense, category])
  }
  for (const category of groups.dang) {
    rows.push([FORM_TYPE_LABELS.dang, category])
  }
  for (const category of groups.receivable) {
    rows.push([FORM_TYPE_LABELS.receivable, category])
  }
  for (const category of groups.personalReminder) {
    rows.push([FORM_TYPE_LABELS.personalReminder, category])
  }

  return rows
}

function applyGroupsToSettings(groups: CategoryGroups): void {
  const settings = getSettings() ?? getDefaultSettings()

  const forms = settings.forms.map(form => {
    if (form.type !== 'income' && form.type !== 'expense') return form

    const options = groups[form.type]

    return {
      ...form,
      fields: form.fields.map(field => (field.id === 'category' ? { ...field, options } : field))
    }
  })

  saveSettings({
    ...settings,
    forms,
    dangCategories: groups.dang,
    receivableCategories: groups.receivable,
    personalReminderCategories: groups.personalReminder
  })
}

export async function ensureCategoriesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, CATEGORIES_SHEET, CATEGORIES_HEADERS)
}

export async function fetchCategoriesFromSheet(spreadsheetId: string): Promise<CategoryGroups> {
  const rows = await fetchSheetRows(spreadsheetId, CATEGORIES_SHEET)

  return rowsToGroups(rows)
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

function withDefaults(groups: CategoryGroups): CategoryGroups {
  return {
    income: groups.income.length ? groups.income : [...DEFAULT_INCOME_CATEGORIES],
    expense: groups.expense.length ? groups.expense : [...DEFAULT_EXPENSE_CATEGORIES],
    dang: groups.dang.length ? groups.dang : [...DEFAULT_DANG_CATEGORIES],
    receivable: groups.receivable.length ? groups.receivable : [...DEFAULT_RECEIVABLE_CATEGORIES],
    personalReminder: groups.personalReminder.length
      ? groups.personalReminder
      : [...DEFAULT_PERSONAL_REMINDER_CATEGORIES]
  }
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
    !fromSheet.personalReminder.length

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
