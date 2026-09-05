import { useCallback, useMemo } from 'react'

import type { TimesheetWithRow } from './useTimesheetsPage'
import { useListFilters } from '../../hooks/useListFilters'
import { useListSort } from '../../hooks/useListSort'
import { compactFilterChips } from '../../utils/filterChips'
import {
  compareTimesheets,
  TIMESHEET_LIST_SORT_OPTIONS,
  type TimesheetListSortId
} from '../../utils/timesheetSort'

export function useTimesheetsFilters(items: TimesheetWithRow[]) {
  const filters = useListFilters({
    items,
    getSearchParts: item => [item.title, item.description]
  })

  const sort = useListSort<TimesheetListSortId, TimesheetWithRow>({
    options: TIMESHEET_LIST_SORT_OPTIONS,
    defaultSort: 'title',
    compare: compareTimesheets
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
