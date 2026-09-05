import { useCallback, useMemo } from 'react'

import type { TimesheetEntryWithRow } from './useTimesheetDetailPage'
import { useListFilters } from '../../hooks/useListFilters'
import { useListSort } from '../../hooks/useListSort'
import { compactFilterChips } from '../../utils/filterChips'
import {
  compareTimesheetEntries,
  TIMESHEET_ENTRY_SORT_OPTIONS,
  type TimesheetEntrySortId
} from '../../utils/timesheetSort'
import { createDefaultDateRangeFilter } from '../DateRangeFilter'

export function useTimesheetEntryFilters(items: TimesheetEntryWithRow[]) {
  const filters = useListFilters({
    items,
    getSearchParts: item => [item.title, item.description],
    getDate: item => item.startAt.slice(0, 10),
    isSettled: item => item.checked,
    paymentStatusLabels: { paid: 'تایید شده', unpaid: 'تایید نشده' },
    defaultDateFilter: createDefaultDateRangeFilter(),
    dateChipLockedPresets: ['month-to-date']
  })

  const sort = useListSort<TimesheetEntrySortId, TimesheetEntryWithRow>({
    options: TIMESHEET_ENTRY_SORT_OPTIONS,
    defaultSort: 'startAt',
    compare: compareTimesheetEntries
  })

  const filteredItems = useMemo(
    () => sort.sortItems(filters.filteredItems),
    [filters.filteredItems, sort.sortItems]
  )

  const filterChips = useMemo(
    () => compactFilterChips([...filters.filterChips, ...sort.sortChips]),
    [filters.filterChips, sort.sortChips]
  )

  const openFilterModal = useCallback(() => {
    filters.openFilterModal()
    sort.syncDraftFromApplied()
  }, [filters, sort])

  const applyFilters = useCallback(() => {
    filters.applyFilters()
    sort.applyDraftSort()
  }, [filters, sort])

  const clearDraftFilters = useCallback(() => {
    filters.clearDraftFilters()
    sort.clearDraftSort()
  }, [filters, sort])

  const clearAllFilters = useCallback(() => {
    filters.clearAllFilters()
    sort.resetSort()
  }, [filters, sort])

  return {
    ...filters,
    ...sort,
    filteredItems,
    filterChips,
    openFilterModal,
    applyFilters,
    clearDraftFilters,
    clearAllFilters,
    applyDraftFilters: applyFilters
  }
}
