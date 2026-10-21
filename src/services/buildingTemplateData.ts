import type { CategoryGroups } from './categoryGroups'
import type { CategorySubcategoryMap } from '../types'
import { BUILDING_CHARGE_CATEGORY } from '../utils/protectedCategories'

/**
 * Category lists a new building spreadsheet starts with (they replace the personal defaults).
 * «انتقال», «اصلاح موجودی», «شارژ ساختمان» and «طلب» are system categories.
 */
const EXPENSE_SUBCATEGORIES: Record<string, string[]> = {
  آسانسور: ['سرویس', 'تعمیر', 'بیمه'],
  نظافت: ['نظافتچی', 'مواد شوینده'],
  'قبوض مشاعات': ['برق', 'آب', 'گاز'],
  تعمیرات: ['تأسیسات', 'ساختمانی', 'برق‌کشی', 'پمپ و مخزن'],
  اداری: ['پرینت', 'پیک', 'کارمزد']
}

export const BUILDING_EXPENSE_CATEGORIES = [
  'آسانسور',
  'نظافت',
  'قبوض مشاعات',
  'تعمیرات',
  'حقوق سرایدار',
  'بیمه ساختمان',
  'عوارض و شهرداری',
  'اداری',
  'فضای سبز',
  'ایمنی و اطفاء',
  'انتقال',
  'اصلاح موجودی',
  'سایر'
]

const INCOME_SUBCATEGORIES: Record<string, string[]> = {
  'اجارهٔ مشاعات': ['پشت‌بام', 'آنتن', 'انباری']
}

export const BUILDING_INCOME_CATEGORIES = [
  BUILDING_CHARGE_CATEGORY,
  'پارکینگ مهمان',
  'اجارهٔ مشاعات',
  'سود سپرده',
  'جریمه',
  'کمک مالی',
  'طلب',
  'سایر'
]

/** Charges are receivables, so their category must exist in the receivable list. */
export const BUILDING_RECEIVABLE_CATEGORIES = [BUILDING_CHARGE_CATEGORY, 'سایر']

/** Only the lists a building replaces; an empty list is seeded with the usual defaults on first use. */
export function buildingCategoryGroups(): CategoryGroups {
  return {
    income: BUILDING_INCOME_CATEGORIES,
    expense: BUILDING_EXPENSE_CATEGORIES,
    dang: [],
    receivable: BUILDING_RECEIVABLE_CATEGORIES,
    personalReminder: [],
    vehiclePeriodic: [],
    vehicleDeadline: [],
    vehicleMechanic: [],
    vehicleExpense: [],
    walletBank: [],
    walletAccountKind: []
  }
}

export function buildingSubcategories(): CategorySubcategoryMap {
  return { expense: EXPENSE_SUBCATEGORIES, income: INCOME_SUBCATEGORIES }
}
