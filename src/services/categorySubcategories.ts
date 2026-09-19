import { getDefaultSettings, getSettings, saveSettings } from './settings'
import type { CategorySubcategoryMap } from '../types'

export function getSubcategoriesOf(
  map: CategorySubcategoryMap | undefined,
  categoryType: string,
  category: string
): string[] {
  const name = category.trim()

  if (!name) return []

  return map?.[categoryType]?.[name] ?? []
}

export function setSubcategoriesOf(
  map: CategorySubcategoryMap,
  categoryType: string,
  category: string,
  subcategories: string[]
): CategorySubcategoryMap {
  const forType = { ...(map[categoryType] ?? {}) }

  if (subcategories.length) {
    forType[category] = subcategories
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
