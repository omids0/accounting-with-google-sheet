import { useState, useCallback, useMemo } from 'react'

import type { DangWithRow } from './types'
import { formatDateRangeLabel, isDateInRange, resolveDateRange } from '../../utils/dateRange'
import {
  buildCategoryChip,
  buildDateRangeChip,
  buildPaymentStatusChip,
  buildSearchChip,
  compactFilterChips
} from '../../utils/filterChips'
import { matchSearch } from '../../utils/search'
import {
  createAllDateRangeFilter,
  type AppliedDateRangeFilter,
  type DateRangeFilterPreset
} from '../DateRangeFilter'
import type { PaymentStatusFilter } from '../PageFilterPanel'

type UseDangFiltersOptions = {
  items: DangWithRow[]
  categories: string[]
}

export function useDangFilters({ items, categories }: UseDangFiltersOptions) {
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
    const options = new Set<string>(categories)

    for (const item of items) {
      if (item.category) options.add(item.category)
    }

    return [...options]
  }, [categories, items])

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        if (
          !matchSearch(
            searchQuery,
            item.title,
            item.category,
            item.counterparty,
            item.note,
            item.amount,
            item.date
          )
        ) {
          return false
        }

        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false
        }

        if (dateRange && !isDateInRange(item.date, dateRange)) {
          return false
        }

        if (paymentStatusFilter === 'paid' && !item.paid) return false
        if (paymentStatusFilter === 'unpaid' && item.paid) return false

        return true
      }),
    [items, searchQuery, categoryFilter, dateRange, paymentStatusFilter]
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
          buildPaymentStatusChip(paymentStatusFilter, () => setPaymentStatusFilter('all')),
        categoryFilter !== 'all' &&
          buildCategoryChip(categoryFilter, () => setCategoryFilter('all')),
        datePreset !== 'all' &&
          dateRange &&
          buildDateRangeChip(formatDateRangeLabel(dateRange), resetDateFilter)
      ]),
    [searchQuery, paymentStatusFilter, categoryFilter, datePreset, dateRange, resetDateFilter]
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
    draftCustomRange,
    categoryOptions,
    filteredItems,
    openFilterModal,
    filterChips,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  }
}
