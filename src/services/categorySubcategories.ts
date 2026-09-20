import { getDefaultSettings, getSettings, saveSettings } from './settings'
import type { CategorySubcategoryMap } from '../types'
import { withOtherLast, withoutOtherCategory } from '../utils/categoryOrdering'

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
