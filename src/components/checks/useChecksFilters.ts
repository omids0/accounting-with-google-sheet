import { useCallback, useMemo } from 'react'

import { CHECK_DIRECTION_OPTIONS } from './checkDirectionOptions'
import type { CheckWithRow } from './types'
import { useKindFilter } from '../../hooks/useKindFilter'
import { useListFilters } from '../../hooks/useListFilters'
import { getCounterpartyFullName } from '../../services/counterparties'
import type { CounterpartyWithRow } from '../counterparties/types'

type UseChecksFiltersOptions = {
  items: CheckWithRow[]
  counterparties: CounterpartyWithRow[]
}

const getDirection = (item: CheckWithRow) => item.direction

export function useChecksFilters({ items, counterparties }: UseChecksFiltersOptions) {
  const counterpartySeed = useMemo(
    () => counterparties.map(item => getCounterpartyFullName(item)),
    [counterparties]
  )

  // «نوع چک»: in the filter sheet with the others, and `direction.set` for the quick control
  // above the list. It joins the list filters' draft, apply, chip and clear steps below.
  const direction = useKindFilter({
    getKind: getDirection,
    options: CHECK_DIRECTION_OPTIONS,
    label: 'نوع چک'
  })

  const filters = useListFilters({
    items,
    getSearchParts: item => [
      item.checkNumber,
      item.counterparty,
      item.amount,
      item.creationDate,
      item.dueDate
    ],
    getDate: item => item.dueDate,
    getCounterparty: item => item.counterparty,
    getWriter: item => item.writer,
    counterpartySeed
  })

  const filteredItems = useMemo(
    () => filters.filteredItems.filter(direction.matches),
    [filters.filteredItems, direction.matches]
  )

  const filterChips = useMemo(
    () => (direction.chip ? [...filters.filterChips, direction.chip] : filters.filterChips),
    [filters.filterChips, direction.chip]
  )

  const { startDraft, applyDraft, clearDraft, clearAll } = direction
  const { openFilterModal: openList, applyFilters: applyList } = filters
  const { clearDraftFilters: clearDraftList, clearAllFilters: clearAllList } = filters

  const openFilterModal = useCallback(() => {
    startDraft()
    openList()
  }, [startDraft, openList])

  const applyFilters = useCallback(() => {
    applyDraft()
    applyList()
  }, [applyDraft, applyList])

  const clearDraftFilters = useCallback(() => {
    clearDraft()
    clearDraftList()
  }, [clearDraft, clearDraftList])

  const clearAllFilters = useCallback(() => {
    clearAll()
    clearAllList()
  }, [clearAll, clearAllList])

  return {
    ...filters,
    filteredItems,
    filterChips,
    direction,
    openFilterModal,
    applyFilters,
    clearDraftFilters,
    clearAllFilters
  }
}
