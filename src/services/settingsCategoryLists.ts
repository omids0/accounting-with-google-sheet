import type { AppSettings } from '../types'
import { withOtherLast } from '../utils/categoryOrdering'

export const DEFAULT_INCOME_CATEGORIES = ['حقوق', 'فروش', 'سرمایه‌گذاری', 'هدیه', 'طلب', 'سایر']
export const DEFAULT_EXPENSE_CATEGORIES = [
  'خوراک',
  'حمل‌ونقل',
  'اجاره',
  'قبوض',
  'تفریح',
  'پوشاک',
  'قسط',
  'چک',
  'سایر'
]
export const DEFAULT_DANG_CATEGORIES = ['شخصی', 'قرض', 'خرید', 'سایر']
export const DEFAULT_RECEIVABLE_CATEGORIES = ['شخصی', 'قرض', 'سازمان', 'سایر']
export const DEFAULT_PERSONAL_REMINDER_CATEGORIES = ['قبض', 'بیمه', 'مالیات', 'اشتراک', 'سایر']

const CATEGORY_LIST_KEYS = [
  'dangCategories',
  'receivableCategories',
  'personalReminderCategories',
  'vehiclePeriodicCategories',
  'vehicleDeadlineCategories',
  'vehicleMechanicCategories',
  'vehicleExpenseCategories'
] as const

/** Every stored category list keeps «سایر» as its last option. */
export function normalizeCategoryLists(settings: AppSettings): AppSettings {
  const next: AppSettings = {
    ...settings,
    forms: settings.forms.map(form => ({
      ...form,
      fields: form.fields.map(field =>
        field.id === 'category' && field.options
          ? { ...field, options: withOtherLast(field.options) }
          : field
      )
    }))
  }

  for (const key of CATEGORY_LIST_KEYS) {
    const stored = next[key]

    if (stored?.length) next[key] = withOtherLast(stored)
  }

  return next
}
