import { useState, useCallback, useMemo } from 'react'

import type { CheckWithRow } from './types'
import { formatDateRangeLabel, isDateInRange, resolveDateRange } from '../../utils/dateRange'
import {
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

type UseChecksFiltersOptions = {
  items: CheckWithRow[]
}

export function useChecksFilters({ items }: UseChecksFiltersOptions) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftSearch, setDraftSearch] = useState('')
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<PaymentStatusFilter>('all')
  const [draftDatePreset, setDraftDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  )
  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createAllDateRangeFilter().customRange
  )
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all')
  const [datePreset, setDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  )
  const [customRange, setCustomRange] = useState(() => createAllDateRangeFilter().customRange)

  const dateRange = useMemo(
    () => (datePreset === 'all' ? null : resolveDateRange(datePreset, customRange)),
    [datePreset, customRange]
  )

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        if (
          !matchSearch(
            searchQuery,
            item.checkNumber,
            item.counterparty,
            item.amount,
            item.creationDate,
            item.dueDate
          )
        ) {
          return false
        }

        if (dateRange && !isDateInRange(item.dueDate, dateRange)) {
          return false
        }

        if (paymentStatusFilter === 'paid' && !item.paid) return false
        if (paymentStatusFilter === 'unpaid' && item.paid) return false

        return true
      }),
    [items, searchQuery, dateRange, paymentStatusFilter]
  )

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setDraftPaymentStatus(paymentStatusFilter)
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setFilterModalOpen(true)
  }, [searchQuery, paymentStatusFilter, datePreset, customRange])

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
        datePreset !== 'all' &&
          dateRange &&
          buildDateRangeChip(formatDateRangeLabel(dateRange), resetDateFilter)
      ]),
    [searchQuery, paymentStatusFilter, datePreset, dateRange, resetDateFilter]
  )

  const handleDraftDateFilterChange = (filter: AppliedDateRangeFilter) => {
    setDraftDatePreset(filter.preset)
    setDraftCustomRange(filter.customRange)
  }

  const clearDraftFilters = () => {
    const defaults = createAllDateRangeFilter()

    setDraftSearch('')
    setDraftPaymentStatus('all')
    setDraftDatePreset(defaults.preset)
    setDraftCustomRange(defaults.customRange)
  }

  const applyFilters = () => {
    setSearchQuery(draftSearch)
    setPaymentStatusFilter(draftPaymentStatus)
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    setFilterModalOpen(false)
  }

  return {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftPaymentStatus,
    setDraftPaymentStatus,
    draftDatePreset,
    draftCustomRange,
    filteredItems,
    openFilterModal,
    filterChips,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  }
}
