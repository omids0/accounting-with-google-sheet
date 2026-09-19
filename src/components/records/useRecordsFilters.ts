import { useCallback, useMemo, useState } from 'react'

import type { StoredRecord } from './recordsUtils'
import { useRecordsSubcategoryFilter } from './useRecordsSubcategoryFilter'
import { getSettings } from '../../services/settings'
import type { CustomForm } from '../../types'
import {
  formatDateRangeLabel,
  resolveDateRange,
  type RecordsDatePreset
} from '../../utils/dateRange'
import {
  buildCategoryChip,
  buildDateRangeChip,
  buildSubCategoryChip,
  compactFilterChips
} from '../../utils/filterChips'
import { createDefaultDateRangeFilter, type AppliedDateRangeFilter } from '../DateRangeFilter'

export function useRecordsFilters({
  records,
  activeForm,
  showCategoryFilter,
  onFormsRefresh
}: {
  records: StoredRecord[]
  activeForm?: CustomForm
  showCategoryFilter: boolean
  onFormsRefresh: (forms: CustomForm[]) => void
}) {
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date')
  const [customRange, setCustomRange] = useState(() => createDefaultDateRangeFilter().customRange)
  const [categoryFilter, setCategoryFilterValue] = useState('all')
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftDatePreset, setDraftDatePreset] = useState<RecordsDatePreset>('month-to-date')
  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  )
  const [draftCategory, setDraftCategoryValue] = useState('all')

  const dateRange = resolveDateRange(datePreset, customRange)

  const subcategory = useRecordsSubcategoryFilter(
    categoryFilter,
    draftCategory,
    records,
    activeForm
  )

  const { setSubCategoryFilter, setDraftSubCategory } = subcategory

  const setCategoryFilter = useCallback(
    (next: string) => {
      setCategoryFilterValue(next)
      setSubCategoryFilter('all')
    },
    [setSubCategoryFilter]
  )

  const setDraftCategory = useCallback(
    (next: string) => {
      setDraftCategoryValue(next)
      setDraftSubCategory('all')
    },
    [setDraftSubCategory]
  )

  const resetDateFilter = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setDatePreset('month-to-date')
    setCustomRange(defaults.customRange)
  }, [])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildDateRangeChip(
          formatDateRangeLabel(dateRange),
          datePreset !== 'month-to-date' ? resetDateFilter : undefined
        ),
        showCategoryFilter &&
          categoryFilter !== 'all' &&
          buildCategoryChip(categoryFilter, () => setCategoryFilter('all')),
        subcategory.subCategoryFilter !== 'all' &&
          buildSubCategoryChip(subcategory.subCategoryFilter, () => setSubCategoryFilter('all'))
      ]),
    [
      categoryFilter,
      datePreset,
      dateRange,
      resetDateFilter,
      setCategoryFilter,
      setSubCategoryFilter,
      showCategoryFilter,
      subcategory.subCategoryFilter
    ]
  )

  const openFilterModal = useCallback(() => {
    const settings = getSettings()

    if (settings) onFormsRefresh(settings.forms)

    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setDraftCategoryValue(categoryFilter)
    setDraftSubCategory(subcategory.subCategoryFilter)
    setFilterModalOpen(true)
  }, [
    categoryFilter,
    customRange,
    datePreset,
    onFormsRefresh,
    setDraftSubCategory,
    subcategory.subCategoryFilter
  ])

  const handleDraftDateFilterChange = (filter: AppliedDateRangeFilter) => {
    if (filter.preset === 'all') return
    setDraftDatePreset(filter.preset)
    setDraftCustomRange(filter.customRange)
  }

  const clearDraftFilters = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setDraftDatePreset('month-to-date')
    setDraftCustomRange(defaults.customRange)
    setDraftCategory('all')
  }, [setDraftCategory])

  const applyFilters = useCallback(() => {
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    setCategoryFilterValue(draftCategory)
    setSubCategoryFilter(subcategory.draftSubCategory)
    setFilterModalOpen(false)
  }, [
    draftCategory,
    draftCustomRange,
    draftDatePreset,
    setSubCategoryFilter,
    subcategory.draftSubCategory
  ])

  const clearAllFilters = useCallback(() => {
    resetDateFilter()
    setCategoryFilter('all')
  }, [resetDateFilter, setCategoryFilter])

  return {
    datePreset,
    customRange,
    dateRange,
    categoryFilter,
    setCategoryFilter,
    subcategory,
    filterModalOpen,
    setFilterModalOpen,
    draftDatePreset,
    draftCustomRange,
    draftCategory,
    setDraftCategory,
    filterChips,
    openFilterModal,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters,
    clearAllFilters
  }
}
