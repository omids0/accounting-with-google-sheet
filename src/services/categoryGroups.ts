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
import { DEFAULT_VEHICLE_EXPENSE_CATEGORIES } from './vehicleExpenseCategories'
import { DEFAULT_VEHICLE_MECHANIC_CATEGORIES } from './vehicleMechanicCategories'
import { DEFAULT_VEHICLE_PERIODIC_CATEGORIES } from './vehiclePeriodicCategories'
import { withLockedExpenseCategories } from '../utils/protectedCategories'

export type CategoryType =
  | 'income'
  | 'expense'
  | 'dang'
  | 'receivable'
  | 'personalReminder'
  | 'vehiclePeriodic'
  | 'vehicleMechanic'
  | 'vehicleExpense'

const FORM_TYPE_LABELS: Record<CategoryType, string> = {
  income: 'درآمد',
  expense: 'هزینه',
  dang: 'بدهی',
  receivable: 'طلب',
  personalReminder: 'یادآوری',
  vehiclePeriodic: 'سرویس دوره‌ای',
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
  vehicleMechanic: string[]
  vehicleExpense: string[]
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
  if (
    normalized === 'vehicleperiodic' ||
    normalized === 'vehicle_periodic' ||
    normalized === 'سرویس دوره‌ای' ||
    normalized === 'سرویس خودرو'
  )
    return 'vehiclePeriodic'
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
    vehicleMechanic: [],
    vehicleExpense: []
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

export function groupsToRows(groups: CategoryGroups): string[][] {
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
  for (const category of groups.vehiclePeriodic) {
    rows.push([FORM_TYPE_LABELS.vehiclePeriodic, category])
  }
  for (const category of groups.vehicleMechanic) {
    rows.push([FORM_TYPE_LABELS.vehicleMechanic, category])
  }
  for (const category of groups.vehicleExpense) {
    rows.push([FORM_TYPE_LABELS.vehicleExpense, category])
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
    vehicleMechanic: groups.vehicleMechanic.length
      ? groups.vehicleMechanic
      : [...DEFAULT_VEHICLE_MECHANIC_CATEGORIES],
    vehicleExpense: groups.vehicleExpense.length
      ? groups.vehicleExpense
      : [...DEFAULT_VEHICLE_EXPENSE_CATEGORIES]
  }
}

export function applyGroupsToSettings(groups: CategoryGroups): void {
  const settings = getSettings() ?? getDefaultSettings()

  const forms = settings.forms.map(form => {
    if (form.type !== 'income' && form.type !== 'expense') return form

    const options =
      form.type === 'expense' ? withLockedExpenseCategories(groups.expense) : groups[form.type]

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
    personalReminderCategories: groups.personalReminder,
    vehiclePeriodicCategories: groups.vehiclePeriodic,
    vehicleMechanicCategories: groups.vehicleMechanic,
    vehicleExpenseCategories: groups.vehicleExpense
  })
}
