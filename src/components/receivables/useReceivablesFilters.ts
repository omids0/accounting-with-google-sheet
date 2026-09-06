import { useMemo } from 'react'

import type { ReceivableWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'
import { getCounterpartyFullName } from '../../services/counterparties'
import { isReceivableComplete, remainingAmount } from '../../services/receivables'
import type { CounterpartyWithRow } from '../counterparties/types'

export function useReceivablesFilters(
  items: ReceivableWithRow[],
  categories: string[],
  counterparties: CounterpartyWithRow[]
) {
  const counterpartySeed = useMemo(
    () => counterparties.map(item => getCounterpartyFullName(item)),
    [counterparties]
  )

  const filters = useListFilters({
    items,
    getSearchParts: item => [
      item.title,
      item.debtor,
      item.category,
      item.note,
      item.amount,
      item.borrowDate
    ],
    getDate: item => item.borrowDate,
    getCategory: item => item.category,
    categorySeed: categories,
    getCounterparty: item => item.debtor,
    counterpartySeed,
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
