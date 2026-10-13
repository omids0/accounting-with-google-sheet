import { useCallback, useMemo, useState } from 'react'

import { useMineFilter } from './useMineFilter'
import {
  createAllDateRangeFilter,
  type AppliedDateRangeFilter,
  type DateRangeFilterPreset
} from '../components/DateRangeFilter'
import type { PaymentStatusFilter } from '../components/PageFilterPanel'
import { formatDateRangeLabel, isDateInRange, resolveDateRange } from '../utils/dateRange'
import {
  buildCategoryChip,
  buildCounterpartyChip,
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
  getCounterparty?: (item: T) => string
  counterpartySeed?: string[]
  /** Email in «ثبت‌کننده»; enables «فقط من» on a shared spreadsheet. */
  getWriter?: (item: T) => string | undefined
  isSettled?: (item: T) => boolean
  paymentStatusLabels?: PaymentStatusLabels
  defaultDateFilter?: AppliedDateRangeFilter
  dateChipLockedPresets?: DateRangeFilterPreset[]
}

export function useListFilters<T>({
  items,
  getSearchParts,
  getDate,
  getCategory,
  categorySeed = [],
  getCounterparty,
  counterpartySeed = [],
  getWriter,
  isSettled,
  paymentStatusLabels,
  defaultDateFilter,
  dateChipLockedPresets = []
}: UseListFiltersOptions<T>) {
  const hasCategory = Boolean(getCategory)
  const hasCounterparty = Boolean(getCounterparty)
  const mine = useMineFilter(getWriter)
  const { startDraft: startMineDraft, clearAll: clearMine, matches: matchesMine } = mine

  const initialDateFilter = useMemo(
    () => defaultDateFilter ?? createAllDateRangeFilter(),
    [defaultDateFilter]
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftSearch, setDraftSearch] = useState('')
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<PaymentStatusFilter>('all')
  const [draftCategory, setDraftCategory] = useState('all')
  const [draftCounterparty, setDraftCounterparty] = useState('all')
  const [draftDatePreset, setDraftDatePreset] = useState<DateRangeFilterPreset>(
    () => initialDateFilter.preset
  )
  const [draftCustomRange, setDraftCustomRange] = useState(() => initialDateFilter.customRange)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [counterpartyFilter, setCounterpartyFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DateRangeFilterPreset>(
    () => initialDateFilter.preset
  )
  const [customRange, setCustomRange] = useState(() => initialDateFilter.customRange)

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

  const counterpartyOptions = useMemo(() => {
    if (!getCounterparty) return []

    const options = new Set<string>(counterpartySeed)

    for (const item of items) {
      const counterparty = getCounterparty(item)

      if (counterparty) options.add(counterparty)
    }

    return [...options].sort((a, b) => a.localeCompare(b, 'fa'))
  }, [counterpartySeed, getCounterparty, items])

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        if (!matchSearch(searchQuery, ...getSearchParts(item))) return false

        if (hasCategory && getCategory && categoryFilter !== 'all') {
          if (getCategory(item) !== categoryFilter) return false
        }

        if (hasCounterparty && getCounterparty && counterpartyFilter !== 'all') {
          if (getCounterparty(item) !== counterpartyFilter) return false
        }

        if (getDate && dateRange && !isDateInRange(getDate(item), dateRange)) return false
        if (!matchesMine(item)) return false

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
      hasCounterparty,
      getCounterparty,
      counterpartyFilter,
      getDate,
      dateRange,
      paymentStatusFilter,
      isSettled,
      matchesMine
    ]
  )

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setDraftPaymentStatus(paymentStatusFilter)
    setDraftCategory(categoryFilter)
    setDraftCounterparty(counterpartyFilter)
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    startMineDraft()
    setFilterModalOpen(true)
  }, [
    startMineDraft,
    searchQuery,
    paymentStatusFilter,
    categoryFilter,
    counterpartyFilter,
    datePreset,
    customRange
  ])

  const resetDateFilter = useCallback(() => {
    setDatePreset(initialDateFilter.preset)
    setCustomRange(initialDateFilter.customRange)
  }, [initialDateFilter.customRange, initialDateFilter.preset])

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
        hasCounterparty &&
          counterpartyFilter !== 'all' &&
          buildCounterpartyChip(counterpartyFilter, () => setCounterpartyFilter('all')),
        datePreset !== 'all' &&
          dateRange &&
          buildDateRangeChip(
            formatDateRangeLabel(dateRange),
            dateChipLockedPresets.includes(datePreset) ? undefined : resetDateFilter
          ),
        mine.chip
      ]),
    [
      searchQuery,
      paymentStatusFilter,
      paymentStatusLabels,
      hasCategory,
      categoryFilter,
      hasCounterparty,
      counterpartyFilter,
      datePreset,
      dateRange,
      dateChipLockedPresets,
      resetDateFilter,
      mine.chip
    ]
  )

  const handleDraftDateFilterChange = (filter: AppliedDateRangeFilter) => {
    setDraftDatePreset(filter.preset)
    setDraftCustomRange(filter.customRange)
  }

  const clearDraftFilters = () => {
    setDraftSearch('')
    setDraftPaymentStatus('all')
    setDraftCategory('all')
    setDraftCounterparty('all')
    setDraftDatePreset(initialDateFilter.preset)
    setDraftCustomRange(initialDateFilter.customRange)
    mine.clearDraft()
  }

  const applyFilters = () => {
    setSearchQuery(draftSearch)
    setPaymentStatusFilter(draftPaymentStatus)
    setCategoryFilter(draftCategory)
    setCounterpartyFilter(draftCounterparty)
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    mine.applyDraft()
    setFilterModalOpen(false)
  }

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setPaymentStatusFilter('all')
    setCategoryFilter('all')
    setCounterpartyFilter('all')
    clearMine()
    resetDateFilter()
  }, [clearMine, resetDateFilter])

  const hasActiveFilters =
    datePreset !== 'all' ||
    paymentStatusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    counterpartyFilter !== 'all' ||
    mine.active ||
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
    draftCounterparty,
    setDraftCounterparty,
    draftDatePreset,
    setDraftDatePreset,
    draftCustomRange,
    setDraftCustomRange,
    datePreset,
    categoryFilter,
    counterpartyFilter,
    paymentStatusFilter,
    categoryOptions,
    counterpartyOptions,
    filteredItems,
    hasActiveFilters,
    /** Spread into `PageFilterPanel` for the «فقط من» toggle. */
    minePanelProps: mine.panelProps,
    openFilterModal,
    filterChips,
    clearAllFilters,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  }
}
