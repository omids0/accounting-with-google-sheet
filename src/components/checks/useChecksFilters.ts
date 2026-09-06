import { useMemo } from 'react'

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

  return useListFilters({
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
    counterpartySeed
  })
}
