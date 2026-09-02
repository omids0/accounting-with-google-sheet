import { useMemo } from 'react'

import type { ReceivableWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'
import { isReceivableComplete, remainingAmount } from '../../services/receivables'

export function useReceivablesFilters(items: ReceivableWithRow[], categories: string[]) {
  const filters = useListFilters({
    items,
    getSearchParts: item => [item.debtor, item.category, item.note, item.amount, item.borrowDate],
    getDate: item => item.borrowDate,
    getCategory: item => item.category,
    categorySeed: categories,
    isSettled: isReceivableComplete,
    paymentStatusLabels: { paid: 'تسویه شده', unpaid: 'پرداخت نشده' }
  })

  const filteredTotalRemaining = useMemo(
    () => filters.filteredItems.reduce((sum, item) => sum + remainingAmount(item), 0),
    [filters.filteredItems]
  )

  const totalRemaining = useMemo(
    () => items.reduce((sum, item) => sum + remainingAmount(item), 0),
    [items]
  )

  const showFilteredTotal =
    filters.filteredItems.length !== items.length || filters.hasActiveFilters

  return {
    ...filters,
    filteredTotalRemaining,
    totalRemaining,
    showFilteredTotal,
    applyDraftFilters: filters.applyFilters
  }
}
