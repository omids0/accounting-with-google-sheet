import { useState, useCallback, useMemo } from 'react'

import type { ReceivableWithRow } from './types'
import { isReceivableComplete, remainingAmount } from '../../services/receivables'
import { formatDateRangeLabel, isDateInRange, resolveDateRange } from '../../utils/dateRange'
import {
  buildCategoryChip,
  buildDateRangeChip,
  buildPaymentStatusChip,
  buildSearchChip,
  compactFilterChips
} from '../../utils/filterChips'
import { matchSearch } from '../../utils/search'
import { createAllDateRangeFilter, type DateRangeFilterPreset } from '../DateRangeFilter'
import type { PaymentStatusFilter } from '../PageFilterPanel'

export function useReceivablesFilters(items: ReceivableWithRow[], categories: string[]) {
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
            item.debtor,
            item.category,
            item.note,
            item.amount,
            item.borrowDate
          )
        ) {
          return false
        }

        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false
        }

        if (dateRange && !isDateInRange(item.borrowDate, dateRange)) {
          return false
        }

        const complete = isReceivableComplete(item)

        if (paymentStatusFilter === 'paid' && !complete) return false
        if (paymentStatusFilter === 'unpaid' && complete) return false

        return true
      }),
    [items, searchQuery, categoryFilter, dateRange, paymentStatusFilter]
  )

  const filteredTotalRemaining = useMemo(
    () => filteredItems.reduce((sum, item) => sum + remainingAmount(item), 0),
    [filteredItems]
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
          buildPaymentStatusChip(paymentStatusFilter, () => setPaymentStatusFilter('all'), {
            paid: 'تسویه شده',
            unpaid: 'پرداخت نشده'
          }),
        categoryFilter !== 'all' &&
          buildCategoryChip(categoryFilter, () => setCategoryFilter('all')),
        datePreset !== 'all' &&
          dateRange &&
          buildDateRangeChip(formatDateRangeLabel(dateRange), resetDateFilter)
      ]),
    [searchQuery, paymentStatusFilter, categoryFilter, datePreset, dateRange, resetDateFilter]
  )

  const clearDraftFilters = () => {
    const defaults = createAllDateRangeFilter()

    setDraftSearch('')
    setDraftPaymentStatus('all')
    setDraftCategory('all')
    setDraftDatePreset(defaults.preset)
    setDraftCustomRange(defaults.customRange)
  }

  const applyDraftFilters = () => {
    setSearchQuery(draftSearch)
    setPaymentStatusFilter(draftPaymentStatus)
    setCategoryFilter(draftCategory)
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    setFilterModalOpen(false)
  }

  const showFilteredTotal =
    filteredItems.length !== items.length ||
    datePreset !== 'all' ||
    paymentStatusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchQuery.trim() !== ''

  const totalRemaining = items.reduce((sum, item) => sum + remainingAmount(item), 0)

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
    categoryOptions,
    filteredItems,
    filteredTotalRemaining,
    totalRemaining,
    showFilteredTotal,
    filterChips,
    openFilterModal,
    clearDraftFilters,
    applyDraftFilters
  }
}
