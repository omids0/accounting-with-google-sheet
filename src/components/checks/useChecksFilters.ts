import type { CheckWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'

type UseChecksFiltersOptions = {
  items: CheckWithRow[]
}

export function useChecksFilters({ items }: UseChecksFiltersOptions) {
  return useListFilters({
    items,
    getSearchParts: item => [
      item.checkNumber,
      item.counterparty,
      item.amount,
      item.creationDate,
      item.dueDate
    ],
    getDate: item => item.dueDate
  })
}
