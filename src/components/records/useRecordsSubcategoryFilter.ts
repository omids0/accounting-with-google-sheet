import { useCallback, useMemo, useState } from 'react'

import type { StoredRecord } from './recordsUtils'
import { getCategorySubcategories, getSubcategoriesOf } from '../../services/categorySubcategories'
import type { CustomForm } from '../../types'
import { SUBCATEGORY_FIELD_ID } from '../form'

const SUBCATEGORY_FORM_TYPES = ['income', 'expense']

/** Subcategory filter for the records page. Only meaningful once a category is picked. */
export function useRecordsSubcategoryFilter(
  categoryFilter: string,
  draftCategory: string,
  records: StoredRecord[],
  activeForm?: CustomForm
) {
  const [subCategoryFilter, setSubCategoryFilter] = useState('all')

  const [draftSubCategory, setDraftSubCategory] = useState('all')

  const optionsFor = useCallback(
    (category: string): string[] => {
      if (!category || category === 'all') return []

      const types = activeForm ? [activeForm.type] : SUBCATEGORY_FORM_TYPES

      const map = getCategorySubcategories()

      const stored = types.flatMap(type => getSubcategoriesOf(map, type, category))

      const used = records
        .filter(record => (record.values.category ?? '') === category)
        .map(record => record.values[SUBCATEGORY_FIELD_ID] ?? '')
        .filter(Boolean)

      return [...new Set([...stored, ...used])]
    },
    [activeForm, records]
  )

  const options = useMemo(() => optionsFor(categoryFilter), [optionsFor, categoryFilter])

  const draftOptions = useMemo(() => optionsFor(draftCategory), [optionsFor, draftCategory])

  const matches = useCallback(
    (record: StoredRecord): boolean =>
      subCategoryFilter === 'all' ||
      (record.values[SUBCATEGORY_FIELD_ID] ?? '') === subCategoryFilter,
    [subCategoryFilter]
  )

  return {
    subCategoryFilter,
    setSubCategoryFilter,
    draftSubCategory,
    setDraftSubCategory,
    options,
    draftOptions,
    matches,
    show: options.length > 0,
    showDraft: draftOptions.length > 0
  }
}
