import { useCallback, useMemo, useState } from 'react'

import {
  createAllDateRangeFilter,
  type AppliedDateRangeFilter,
  type DateRangeFilterPreset
} from '../components/DateRangeFilter'
import type { PaymentStatusFilter } from '../components/PageFilterPanel'
import { formatDateRangeLabel, isDateInRange, resolveDateRange } from '../utils/dateRange'
import {
  buildCategoryChip,
  buildDateRangeChip,
  buildPaymentStatusChip,
  buildSearchChip,
  compactFilterChips
} from '../utils/filterChips'
import { matchSearch } from '../utils/search'

type PaymentStatusLabels = { paid: string; unpaid: string }

export type UseListFiltersOptions<T> = {
  items: T[]
  getSearchParts: (item: T) => (string | number | undefined | null)[]
  getDate?: (item: T) => string
  getCategory?: (item: T) => string
  categorySeed?: string[]
  isSettled?: (item: T) => boolean
  paymentStatusLabels?: PaymentStatusLabels
}

export function useListFilters<T>({
  items,
  getSearchParts,
  getDate,
  getCategory,
  categorySeed = [],
  isSettled,
  paymentStatusLabels
}: UseListFiltersOptions<T>) {
  const hasCategory = Boolean(getCategory)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftSearch, setDraftSearch] = useState('')
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<PaymentStatusFilter>('all')
  const [draftCategory, setDraftCategory] = useState('all')
  const [draftDatePreset, setDraftDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  )
  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createAllDateRangeFilter().customRange
  )
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  )
  const [customRange, setCustomRange] = useState(() => createAllDateRangeFilter().customRange)

  const dateRange = useMemo(
    () => (datePreset === 'all' ? null : resolveDateRange(datePreset, customRange)),
    [datePreset, customRange]
  )

  const categoryOptions = useMemo(() => {
    if (!getCategory) return []

    const options = new Set<string>(categorySeed)

    for (const item of items) {
      const category = getCategory(item)

      if (category) options.add(category)
    }

    return [...options]
  }, [categorySeed, getCategory, items])

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        if (!matchSearch(searchQuery, ...getSearchParts(item))) return false

        if (hasCategory && getCategory && categoryFilter !== 'all') {
          if (getCategory(item) !== categoryFilter) return false
        }

        if (getDate && dateRange && !isDateInRange(getDate(item), dateRange)) return false

        const settled = isSettled ? isSettled(item) : Boolean((item as { paid?: boolean }).paid)

        if (paymentStatusFilter === 'paid' && !settled) return false
        if (paymentStatusFilter === 'unpaid' && settled) return false

        return true
      }),
    [
      items,
      searchQuery,
      getSearchParts,
      hasCategory,
      getCategory,
      categoryFilter,
      getDate,
      dateRange,
      paymentStatusFilter,
      isSettled
    ]
  )

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setDraftPaymentStatus(paymentStatusFilter)
    setDraftCategory(categoryFilter)
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setFilterModalOpen(true)
  }, [searchQuery, paymentStatusFilter, categoryFilter, datePreset, customRange])

  const resetDateFilter = useCallback(() => {
    const defaults = createAllDateRangeFilter()

    setDatePreset(defaults.preset)
    setCustomRange(defaults.customRange)
  }, [])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildSearchChip(searchQuery, () => setSearchQuery('')),
        paymentStatusFilter !== 'all' &&
          buildPaymentStatusChip(
            paymentStatusFilter,
            () => setPaymentStatusFilter('all'),
            paymentStatusLabels
          ),
        hasCategory &&
          categoryFilter !== 'all' &&
          buildCategoryChip(categoryFilter, () => setCategoryFilter('all')),
        datePreset !== 'all' &&
          dateRange &&
          buildDateRangeChip(formatDateRangeLabel(dateRange), resetDateFilter)
      ]),
    [
      searchQuery,
      paymentStatusFilter,
      paymentStatusLabels,
      hasCategory,
      categoryFilter,
      datePreset,
      dateRange,
      resetDateFilter
    ]
  )

  const handleDraftDateFilterChange = (filter: AppliedDateRangeFilter) => {
    setDraftDatePreset(filter.preset)
    setDraftCustomRange(filter.customRange)
  }

  const clearDraftFilters = () => {
    const defaults = createAllDateRangeFilter()

    setDraftSearch('')
    setDraftPaymentStatus('all')
    setDraftCategory('all')
    setDraftDatePreset(defaults.preset)
    setDraftCustomRange(defaults.customRange)
  }

  const applyFilters = () => {
    setSearchQuery(draftSearch)
    setPaymentStatusFilter(draftPaymentStatus)
    setCategoryFilter(draftCategory)
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    setFilterModalOpen(false)
  }

  const hasActiveFilters =
    datePreset !== 'all' ||
    paymentStatusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchQuery.trim() !== ''

  return {
    searchQuery,
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftPaymentStatus,
    setDraftPaymentStatus,
    draftCategory,
    setDraftCategory,
    draftDatePreset,
    setDraftDatePreset,
    draftCustomRange,
    setDraftCustomRange,
    datePreset,
    categoryFilter,
    paymentStatusFilter,
    categoryOptions,
    filteredItems,
    hasActiveFilters,
    openFilterModal,
    filterChips,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  }
}
