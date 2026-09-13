import { useEffect, useRef } from 'react'

import type { HistoryWithRow } from './vehicleDetailMutations'
import { useListFilters } from '../../hooks/useListFilters'
import type { VehicleActiveListItem, VehicleHistoryEntry } from '../../types/vehicles'

const ACTIVE_URGENCY_LABELS: Record<VehicleActiveListItem['urgency'], string> = {
  overdue: 'معوق',
  soon: 'نزدیک',
  ok: 'عادی'
}

const HISTORY_KIND_LABELS: Record<VehicleHistoryEntry['recordKind'], string> = {
  periodic: 'سرویس دوره‌ای',
  deadline: 'موعد',
  mechanic: 'مکانیک'
}

type VehicleDetailFilterItem = VehicleActiveListItem | HistoryWithRow

function isActiveItem(item: VehicleDetailFilterItem): item is VehicleActiveListItem {
  return 'kind' in item
}

type UseVehicleDetailFiltersOptions = {
  detailTab: 'active' | 'history'
  activeItems: VehicleActiveListItem[]
  historyItems: HistoryWithRow[]
}

export function useVehicleDetailFilters({
  detailTab,
  activeItems,
  historyItems
}: UseVehicleDetailFiltersOptions) {
  const isActiveTab = detailTab === 'active'
  const items: VehicleDetailFilterItem[] = isActiveTab ? activeItems : historyItems

  const filters = useListFilters<VehicleDetailFilterItem>({
    items,
    getSearchParts: item => {
      if (isActiveItem(item)) {
        return [item.title, item.subtitle, item.kind, ACTIVE_URGENCY_LABELS[item.urgency]]
      }

      return [
        HISTORY_KIND_LABELS[item.recordKind],
        item.details,
        item.date,
        item.mileage,
        item.amount,
        item.nextKm
      ]
    },
    ...(isActiveTab
      ? {}
      : {
          getDate: (item: VehicleDetailFilterItem) => (isActiveItem(item) ? '' : item.date)
        }),
    getCategory: item =>
      isActiveItem(item)
        ? ACTIVE_URGENCY_LABELS[item.urgency]
        : HISTORY_KIND_LABELS[item.recordKind],
    categorySeed: isActiveTab
      ? Object.values(ACTIVE_URGENCY_LABELS)
      : Object.values(HISTORY_KIND_LABELS)
  })

  const { clearAllFilters, clearDraftFilters } = filters
  const previousTabRef = useRef(detailTab)

  useEffect(() => {
    if (previousTabRef.current === detailTab) return

    previousTabRef.current = detailTab
    clearAllFilters()
    clearDraftFilters()
  }, [detailTab, clearAllFilters, clearDraftFilters])

  return filters
}

export type { VehicleDetailFilterItem }
