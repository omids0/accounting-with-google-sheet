import { useCallback, useEffect, useState } from 'react'

import { saveSubcategoriesToSheet, type CategoryType } from '../../../services/categories'
import {
  getCategorySubcategories,
  getSubcategoriesOf
} from '../../../services/categorySubcategories'
import { getSettings } from '../../../services/settings'

export function readSubcategories(categoryType: CategoryType | undefined, category: string) {
  if (!categoryType || !category) return []

  return getSubcategoriesOf(getCategorySubcategories(), categoryType, category)
}

/** The stored subcategories of one category, with the save path they are edited through. */
export function useSubcategoryList(categoryType: CategoryType | undefined, category: string) {
  const [subcategories, setSubcategories] = useState<string[]>(() =>
    readSubcategories(categoryType, category)
  )

  useEffect(() => {
    setSubcategories(readSubcategories(categoryType, category))
  }, [categoryType, category])

  const persist = useCallback(
    async (next: string[]): Promise<boolean> => {
      const spreadsheetId = getSettings()?.spreadsheetId

      if (!spreadsheetId || !categoryType || !category) return false

      await saveSubcategoriesToSheet(spreadsheetId, categoryType, category, next)

      return true
    },
    [categoryType, category]
  )

  return { subcategories, setSubcategories, persist }
}

/** Drill-down level of CategorySelect: the subcategories of the category being managed. */
export function useSubcategoryManager(categoryType?: CategoryType) {
  const [managingCategory, setManagingCategory] = useState<string | null>(null)

  const list = useSubcategoryList(categoryType, managingCategory ?? '')

  const open = useCallback((category: string) => setManagingCategory(category), [])

  const close = useCallback(() => setManagingCategory(null), [])

  return { ...list, managingCategory, open, close, enabled: Boolean(categoryType) }
}
