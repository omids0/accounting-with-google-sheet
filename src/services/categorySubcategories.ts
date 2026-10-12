import { getDefaultSettings, getSettings, saveSettings } from './settings'
import type { CategorySubcategoryMap } from '../types'
import { withOtherLast, withoutOtherCategory } from '../utils/categoryOrdering'

/** Default subcategories of a new spreadsheet's income and expense categories (round 6, D2). */
export const DEFAULT_SUBCATEGORIES: CategorySubcategoryMap = {
  expense: {
    خوراک: ['سوپرمارکت', 'نان و لبنیات', 'میوه', 'رستوران و بیرون‌بر'],
    خانه: ['اجاره', 'شارژ', 'تعمیر و لوازم', 'خدمتکار'],
    قبوض: ['برق', 'گاز', 'آب', 'اینترنت', 'موبایل'],
    'حمل‌ونقل': ['بنزین', 'تاکسی و اسنپ', 'مترو و اتوبوس', 'پارکینگ و عوارض'],
    خودرو: ['سرویس', 'بیمه', 'معاینه فنی', 'جریمه'],
    سلامت: ['دکتر', 'دارو', 'آزمایش', 'بیمه درمان'],
    آموزش: ['شهریه', 'کتاب و لوازم', 'کلاس'],
    'پوشاک و زیبایی': ['لباس', 'کفش', 'آرایشگاه'],
    'تفریح و سفر': ['سینما و کافه', 'سفر', 'اشتراک‌ها'],
    'هدیه و مناسبت': ['هدیه', 'عیدی', 'مهمانی', 'نذری و خیریه'],
    'خانواده و فرزند': ['مهد و مدرسه', 'اسباب‌بازی', 'پوشک']
  },
  income: {
    حقوق: ['حقوق', 'اضافه‌کار', 'عیدی و پاداش'],
    'کار آزاد': ['پروژه', 'فروش'],
    'سود و سرمایه': ['سود بانکی', 'سهام', 'اجاره‌بها'],
    'هدیه و یارانه': ['یارانه', 'هدیه']
  }
}

/** The default subcategories of one form type, as a fresh copy. */
export function defaultSubcategoriesOf(categoryType: string): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(DEFAULT_SUBCATEGORIES[categoryType] ?? {}).map(([name, list]) => [
      name,
      [...list]
    ])
  )
}

/** A new spreadsheet's map: the defaults of each type being seeded, under what it already has. */
export function seedDefaultSubcategories(
  map: CategorySubcategoryMap,
  seededTypes: string[]
): CategorySubcategoryMap {
  const next = { ...map }

  for (const type of seededTypes) {
    next[type] = { ...defaultSubcategoriesOf(type), ...(map[type] ?? {}) }
  }

  return next
}

/**
 * «سایر» is implicit: it is appended on read and stripped on write, so every
 * category offers it without the sheet carrying a row for each one.
 */
export function getSubcategoriesOf(
  map: CategorySubcategoryMap | undefined,
  categoryType: string,
  category: string
): string[] {
  const name = category.trim()

  if (!name) return []

  return withOtherLast(map?.[categoryType]?.[name] ?? [])
}

export function setSubcategoriesOf(
  map: CategorySubcategoryMap,
  categoryType: string,
  category: string,
  subcategories: string[]
): CategorySubcategoryMap {
  const forType = { ...(map[categoryType] ?? {}) }

  const stored = withoutOtherCategory(subcategories)

  if (stored.length) {
    forType[category] = stored
  } else {
    delete forType[category]
  }

  return { ...map, [categoryType]: forType }
}

export function renameSubcategoryOwner(
  map: CategorySubcategoryMap,
  categoryType: string,
  oldName: string,
  newName: string
): CategorySubcategoryMap {
  const subcategories = map[categoryType]?.[oldName]

  if (!subcategories?.length) return map

  const withoutOld = setSubcategoriesOf(map, categoryType, oldName, [])

  return setSubcategoriesOf(withoutOld, categoryType, newName, subcategories)
}

export function removeSubcategoryOwner(
  map: CategorySubcategoryMap,
  categoryType: string,
  category: string
): CategorySubcategoryMap {
  return setSubcategoriesOf(map, categoryType, category, [])
}

export function getCategorySubcategories(): CategorySubcategoryMap {
  return getSettings()?.categorySubcategories ?? {}
}

export function updateCategorySubcategories(map: CategorySubcategoryMap): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, categorySubcategories: map })
}
