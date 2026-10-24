import { useMemo, useState } from 'react'

import type { CheckDirectionFilter } from './checkDirectionOptions'
import type { CheckWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'
import { getCounterpartyFullName } from '../../services/counterparties'
import type { CounterpartyWithRow } from '../counterparties/types'

type UseChecksFiltersOptions = {
  items: CheckWithRow[]
  counterparties: CounterpartyWithRow[]
}

export function useChecksFilters({ items, counterparties }: UseChecksFiltersOptions) {
  const counterpartySeed = useMemo(
    () => counterparties.map(item => getCounterpartyFullName(item)),
    [counterparties]
  )

  // «همه / پرداختی / دریافتی» sits above the list, outside the filter sheet: one tap.
  const [directionFilter, setDirectionFilter] = useState<CheckDirectionFilter>('all')

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
    () =>
      directionFilter === 'all'
        ? filters.filteredItems
        : filters.filteredItems.filter(item => item.direction === directionFilter),
    [directionFilter, filters.filteredItems]
  )

  return { ...filters, filteredItems, directionFilter, setDirectionFilter }
}
