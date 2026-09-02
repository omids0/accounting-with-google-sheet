import type { DangWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'

type UseDangFiltersOptions = {
  items: DangWithRow[]
  categories: string[]
}

export function useDangFilters({ items, categories }: UseDangFiltersOptions) {
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
    categorySeed: categories
  })
}
