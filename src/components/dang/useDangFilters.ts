import { useMemo } from 'react'

import type { DangWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'
import { getCounterpartyFullName } from '../../services/counterparties'
import type { CounterpartyWithRow } from '../counterparties/types'

type UseDangFiltersOptions = {
  items: DangWithRow[]
  categories: string[]
  counterparties: CounterpartyWithRow[]
}

export function useDangFilters({ items, categories, counterparties }: UseDangFiltersOptions) {
  const counterpartySeed = useMemo(
    () => counterparties.map(item => getCounterpartyFullName(item)),
    [counterparties]
  )

  return useListFilters({
    items,
    getSearchParts: item => [
      item.title,
      item.category,
      item.counterparty,
      item.note,
      item.amount,
      item.date
    ],
    getDate: item => item.date,
    getCategory: item => item.category,
    categorySeed: categories,
    getCounterparty: item => item.counterparty,
    counterpartySeed
  })
}
