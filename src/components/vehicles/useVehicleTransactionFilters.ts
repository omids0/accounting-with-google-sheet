import { useEffect, useRef } from 'react'

import { useListFilters } from '../../hooks/useListFilters'
import { getVehicleTransactionCategoryLabel } from '../../services/vehicleTransactions'
import type { VehicleTransactionItem } from '../../types/vehicles'
import { createDefaultDateRangeFilter } from '../DateRangeFilter'

export function useVehicleTransactionFilters(
  transactions: VehicleTransactionItem[],
  detailTab: 'active' | 'deadlines' | 'history' | 'mileage' | 'transactions' | 'fuel'
) {
  const filters = useListFilters<VehicleTransactionItem>({
    items: transactions,
    getSearchParts: item => [item.title, item.expenseType],
    getDate: item => item.date,
    getCategory: item => getVehicleTransactionCategoryLabel(item),
    defaultDateFilter: createDefaultDateRangeFilter()
  })

  const previousTabRef = useRef(detailTab)

  useEffect(() => {
    if (previousTabRef.current === detailTab) return

    previousTabRef.current = detailTab

    if (detailTab === 'transactions' || detailTab === 'fuel') {
      filters.clearAllFilters()
      filters.clearDraftFilters()
    }
  }, [detailTab, filters.clearAllFilters, filters.clearDraftFilters])

  return filters
}
