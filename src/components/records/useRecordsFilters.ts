import { useCallback, useMemo, useState } from 'react'

import type { StoredRecord } from './recordsUtils'
import { useRecordsExtraFilters } from './useRecordsExtraFilters'
import { useRecordsSubcategoryFilter } from './useRecordsSubcategoryFilter'
import { getSettings } from '../../services/settings'
import type { CustomForm } from '../../types'
import {
  formatDateRangeLabel,
  resolveDateRange,
  type DateRange,
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
  initialCounterparty,
  initialRange,
  onFormsRefresh
}: {
  records: StoredRecord[]
  activeForm?: CustomForm
  showCategoryFilter: boolean
  /** From `/records?counterparty=`. */
  initialCounterparty?: string
  /** From `/records?from=&to=`. */
  initialRange?: DateRange
  onFormsRefresh: (forms: CustomForm[]) => void
}) {
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>(
    initialRange ? 'custom' : 'month-to-date'
  )
  const [customRange, setCustomRange] = useState(
    () => initialRange ?? createDefaultDateRangeFilter().customRange
  )
  const [categoryFilter, setCategoryFilterValue] = useState('all')
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftDatePreset, setDraftDatePreset] = useState<RecordsDatePreset>(datePreset)
  const [draftCustomRange, setDraftCustomRange] = useState(customRange)
  const [draftCategory, setDraftCategoryValue] = useState('all')

  // Stable identity: filteredRecords / filterChips memoize on dateRange.
  const dateRange = useMemo(
    () => resolveDateRange(datePreset, customRange),
    [datePreset, customRange]
  )

  const subcategory = useRecordsSubcategoryFilter(
    categoryFilter,
    draftCategory,
    records,
    activeForm
  )

  const { setSubCategoryFilter, setDraftSubCategory } = subcategory

  const extra = useRecordsExtraFilters(records, initialCounterparty)
  const { startDraft, applyDraft, clearDraft, clearAll: clearExtra } = extra

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
          buildSubCategoryChip(subcategory.subCategoryFilter, () => setSubCategoryFilter('all')),
        ...extra.chips
      ]),
    [
      extra.chips,
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
    startDraft()
    setFilterModalOpen(true)
  }, [
    categoryFilter,
    customRange,
    datePreset,
    onFormsRefresh,
    setDraftSubCategory,
    startDraft,
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
    clearDraft()
  }, [clearDraft, setDraftCategory])

  const applyFilters = useCallback(() => {
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    setCategoryFilterValue(draftCategory)
    setSubCategoryFilter(subcategory.draftSubCategory)
    applyDraft()
    setFilterModalOpen(false)
  }, [
    applyDraft,
    draftCategory,
    draftCustomRange,
    draftDatePreset,
    setSubCategoryFilter,
    subcategory.draftSubCategory
  ])

  const clearAllFilters = useCallback(() => {
    resetDateFilter()
    setCategoryFilter('all')
    clearExtra()
  }, [clearExtra, resetDateFilter, setCategoryFilter])

  return {
    datePreset,
    customRange,
    dateRange,
    categoryFilter,
    setCategoryFilter,
    subcategory,
    extra,
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
