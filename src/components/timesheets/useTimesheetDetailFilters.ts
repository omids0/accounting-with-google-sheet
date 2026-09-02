import { useCallback, useMemo, useState } from 'react'

import type { TimesheetEntryWithRow } from './useTimesheetDetailPage'
import { formatDateRangeLabel, isDateInRange, resolveDateRange } from '../../utils/dateRange'
import { buildDateRangeChip, buildSearchChip, compactFilterChips } from '../../utils/filterChips'
import { matchSearch } from '../../utils/search'
import { createDefaultDateRangeFilter, type DateRangeFilterPreset } from '../DateRangeFilter'

export function useTimesheetDetailFilters(items: TimesheetEntryWithRow[]) {
  const [searchQuery, setSearchQuery] = useState('')

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [draftSearch, setDraftSearch] = useState('')

  const [draftDatePreset, setDraftDatePreset] = useState<DateRangeFilterPreset>(
    () => createDefaultDateRangeFilter().preset
  )

  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  )

  const [datePreset, setDatePreset] = useState<DateRangeFilterPreset>(
    () => createDefaultDateRangeFilter().preset
  )

  const [customRange, setCustomRange] = useState(() => createDefaultDateRangeFilter().customRange)

  const dateRange = useMemo(
    () => (datePreset === 'all' ? null : resolveDateRange(datePreset, customRange)),
    [datePreset, customRange]
  )

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim()

    return items.filter(item => {
      if (query && !matchSearch(query, item.title, item.description)) return false
      if (dateRange) {
        const date = item.startAt.slice(0, 10)

        if (!isDateInRange(date, dateRange)) return false
      }

      return true
    })
  }, [items, searchQuery, dateRange])

  const resetDateFilter = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setDatePreset(defaults.preset)
    setCustomRange(defaults.customRange)
  }, [])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildSearchChip(searchQuery, () => setSearchQuery('')),
        datePreset !== 'all' && dateRange
          ? buildDateRangeChip(
              formatDateRangeLabel(dateRange),
              datePreset !== 'month-to-date' ? resetDateFilter : undefined
            )
          : null
      ]),
    [searchQuery, datePreset, dateRange, resetDateFilter]
  )

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setFilterModalOpen(true)
  }, [searchQuery, datePreset, customRange])

  return {
    searchQuery,
    setSearchQuery,
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftDatePreset,
    setDraftDatePreset,
    draftCustomRange,
    setDraftCustomRange,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
    filteredItems,
    filterChips,
    openFilterModal
  }
}
