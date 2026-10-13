import { defaultSubcategoriesOf } from './categorySubcategories'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './settingsCategoryLists'
import { getItem, setItem } from './storage'
import type { CategorySubcategoryMap } from '../types'
import { isOtherCategory, withOtherLast } from '../utils/categoryOrdering'

/**
 * Round 6 (D2): spreadsheets created before the new default lists get a one-time,
 * dismissable offer on the category page that appends the missing defaults. Nothing is
 * renamed and nothing is added without the tap.
 */

type FormCategoryType = 'income' | 'expense'

const DEFAULTS: Record<FormCategoryType, string[]> = {
  income: DEFAULT_INCOME_CATEGORIES,
  expense: DEFAULT_EXPENSE_CATEGORIES
}

/** Defaults of the type the list does not have yet, in default order. */
export function missingDefaultCategories(type: FormCategoryType, current: string[]): string[] {
  const have = new Set(current.map(name => name.trim()))

  return DEFAULTS[type].filter(name => !isOtherCategory(name) && !have.has(name))
}

export interface DefaultsAppend {
  categories: string[]
  subcategories: CategorySubcategoryMap
  added: string[]
}

/**
 * The list with the missing defaults appended before «سایر»; only the added categories
 * get their default subcategories, so a category the user already has is left alone.
 */
export function appendMissingDefaults(
  type: FormCategoryType,
  current: string[],
  map: CategorySubcategoryMap
): DefaultsAppend {
  const added = missingDefaultCategories(type, current)
  const defaults = defaultSubcategoriesOf(type)
  const forType = { ...(map[type] ?? {}) }

  for (const name of added) {
    if (defaults[name] && !forType[name]?.length) forType[name] = defaults[name]
  }

  return {
    categories: withOtherLast([...current, ...added]),
    subcategories: { ...map, [type]: forType },
    added
  }
}

/** Per spreadsheet `{ [spreadsheetId]: true }` once the offer was used or dismissed. */
export const CATEGORY_DEFAULTS_OFFER_KEY = 'accounting_category_defaults_offer_v1'

export function isDefaultsOfferClosed(spreadsheetId: string | undefined): boolean {
  if (!spreadsheetId) return true

  return Boolean(getItem<Record<string, true>>(CATEGORY_DEFAULTS_OFFER_KEY)?.[spreadsheetId])
}

export function closeDefaultsOffer(spreadsheetId: string | undefined): void {
  if (!spreadsheetId) return

  const store = getItem<Record<string, true>>(CATEGORY_DEFAULTS_OFFER_KEY) ?? {}

  try {
    setItem(CATEGORY_DEFAULTS_OFFER_KEY, { ...store, [spreadsheetId]: true })
  } catch {
    // Private mode: the offer comes back on the next visit.
  }
}
