import {
  DEFAULT_DANG_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PERSONAL_REMINDER_CATEGORIES,
  DEFAULT_RECEIVABLE_CATEGORIES,
  getDefaultSettings,
  getSettings,
  saveSettings
} from './settings'
import { DEFAULT_VEHICLE_DEADLINE_CATEGORIES } from './vehicleDeadlineCategories'
import { DEFAULT_VEHICLE_EXPENSE_CATEGORIES } from './vehicleExpenseCategories'
import { DEFAULT_VEHICLE_MECHANIC_CATEGORIES } from './vehicleMechanicCategories'
import { DEFAULT_VEHICLE_PERIODIC_CATEGORIES } from './vehiclePeriodicCategories'
import type { CategorySubcategoryMap } from '../types'
import { withLockedFormCategories } from '../utils/protectedCategories'

export type CategoryType =
  | 'income'
  | 'expense'
  | 'dang'
  | 'receivable'
  | 'personalReminder'
  | 'vehiclePeriodic'
  | 'vehicleDeadline'
  | 'vehicleMechanic'
  | 'vehicleExpense'

const FORM_TYPE_LABELS: Record<CategoryType, string> = {
  income: 'درآمد',
  expense: 'هزینه',
  dang: 'بدهی',
  receivable: 'طلب',
  personalReminder: 'یادآوری',
  vehiclePeriodic: 'سرویس دوره‌ای',
  vehicleDeadline: 'موعد خودرو',
  vehicleMechanic: 'مکانیک',
  vehicleExpense: 'هزینه خودرو'
}

export interface CategoryGroups {
  income: string[]
  expense: string[]
  dang: string[]
  receivable: string[]
  personalReminder: string[]
  vehiclePeriodic: string[]
  vehicleDeadline: string[]
  vehicleMechanic: string[]
  vehicleExpense: string[]
}

const CATEGORY_TYPES = Object.keys(FORM_TYPE_LABELS) as CategoryType[]

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
  if (
    normalized === 'vehicleperiodic' ||
    normalized === 'vehicle_periodic' ||
    normalized === 'سرویس دوره‌ای' ||
    normalized === 'سرویس خودرو'
  )
    return 'vehiclePeriodic'
  if (
    normalized === 'vehicledeadline' ||
    normalized === 'vehicle_deadline' ||
    normalized === 'موعد خودرو' ||
    normalized === 'موعد_خودرو'
  )
    return 'vehicleDeadline'
  if (
    normalized === 'vehiclemechanic' ||
    normalized === 'vehicle_mechanic' ||
    normalized === 'مکانیک' ||
    normalized === 'مراجعه مکانیک'
  )
    return 'vehicleMechanic'
  if (
    normalized === 'vehicleexpense' ||
    normalized === 'vehicle_expense' ||
    normalized === 'هزینه خودرو' ||
    normalized === 'هزینه_خودرو'
  )
    return 'vehicleExpense'

  return null
}

export function rowsToGroups(rows: string[][]): CategoryGroups {
  const groups: CategoryGroups = {
    income: [],
    expense: [],
    dang: [],
    receivable: [],
    personalReminder: [],
    vehiclePeriodic: [],
    vehicleDeadline: [],
    vehicleMechanic: [],
    vehicleExpense: []
  }

  for (const row of rows) {
    const formType = parseFormType(row[0] ?? '')

    const category = String(row[1] ?? '').trim()

    if (!formType || !category) continue
    if (String(row[2] ?? '').trim()) continue
    if (!groups[formType].includes(category)) {
      groups[formType].push(category)
    }
  }

  return groups
}

export function rowsToSubcategories(rows: string[][]): CategorySubcategoryMap {
  const map: CategorySubcategoryMap = {}

  for (const row of rows) {
    const formType = parseFormType(row[0] ?? '')

    const category = String(row[1] ?? '').trim()

    const subcategory = String(row[2] ?? '').trim()

    if (!formType || !category || !subcategory) continue

    const forType = (map[formType] ??= {})

    const list = (forType[category] ??= [])

    if (!list.includes(subcategory)) list.push(subcategory)
  }

  return map
}

export function groupsToRows(
  groups: CategoryGroups,
  subcategories: CategorySubcategoryMap = {}
): string[][] {
  const rows: string[][] = []

  for (const formType of CATEGORY_TYPES) {
    const label = FORM_TYPE_LABELS[formType]

    const pending = { ...(subcategories[formType] ?? {}) }

    for (const category of groups[formType]) {
      rows.push([label, category, ''])

      for (const subcategory of pending[category] ?? []) {
        rows.push([label, category, subcategory])
      }
      delete pending[category]
    }

    // Subcategories of a category that is mid-rename or mid-delete keep their rows,
    // so a two-step rename cannot lose them between the writes.
    for (const [category, list] of Object.entries(pending) as [string, string[]][]) {
      for (const subcategory of list) {
        rows.push([label, category, subcategory])
      }
    }
  }

  return rows
}

export function withDefaults(groups: CategoryGroups): CategoryGroups {
  return {
    income: groups.income.length ? groups.income : [...DEFAULT_INCOME_CATEGORIES],
    expense: groups.expense.length ? groups.expense : [...DEFAULT_EXPENSE_CATEGORIES],
    dang: groups.dang.length ? groups.dang : [...DEFAULT_DANG_CATEGORIES],
    receivable: groups.receivable.length ? groups.receivable : [...DEFAULT_RECEIVABLE_CATEGORIES],
    personalReminder: groups.personalReminder.length
      ? groups.personalReminder
      : [...DEFAULT_PERSONAL_REMINDER_CATEGORIES],
    vehiclePeriodic: groups.vehiclePeriodic.length
      ? groups.vehiclePeriodic
      : [...DEFAULT_VEHICLE_PERIODIC_CATEGORIES],
    vehicleDeadline: groups.vehicleDeadline.length
      ? groups.vehicleDeadline
      : [...DEFAULT_VEHICLE_DEADLINE_CATEGORIES],
    vehicleMechanic: groups.vehicleMechanic.length
      ? groups.vehicleMechanic
      : [...DEFAULT_VEHICLE_MECHANIC_CATEGORIES],
    vehicleExpense: groups.vehicleExpense.length
      ? groups.vehicleExpense
      : [...DEFAULT_VEHICLE_EXPENSE_CATEGORIES]
  }
}

export function applyGroupsToSettings(
  groups: CategoryGroups,
  subcategories?: CategorySubcategoryMap
): void {
  const settings = getSettings() ?? getDefaultSettings()

  const forms = settings.forms.map(form => {
    if (form.type !== 'income' && form.type !== 'expense') return form

    const options = withLockedFormCategories(form.type, groups[form.type])

    return {
      ...form,
      fields: form.fields.map(field => (field.id === 'category' ? { ...field, options } : field))
    }
  })

  saveSettings({
    ...settings,
    forms,
    categorySubcategories: subcategories ?? settings.categorySubcategories,
    dangCategories: groups.dang,
    receivableCategories: groups.receivable,
    personalReminderCategories: groups.personalReminder,
    vehiclePeriodicCategories: groups.vehiclePeriodic,
    vehicleDeadlineCategories: groups.vehicleDeadline,
    vehicleMechanicCategories: groups.vehicleMechanic,
    vehicleExpenseCategories: groups.vehicleExpense
  })
}
