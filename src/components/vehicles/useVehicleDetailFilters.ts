import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { HistoryWithRow } from './vehicleDetailMutations'
import { useListFilters } from '../../hooks/useListFilters'
import type { VehicleActiveListItem, VehicleHistoryEntry } from '../../types/vehicles'
import { compactFilterChips } from '../../utils/filterChips'
import type { FilterChip } from '../ActiveFilterChips'

const ACTIVE_URGENCY_LABELS: Record<VehicleActiveListItem['urgency'], string> = {
  overdue: 'گذشته',
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

function getItemServiceType(item: VehicleDetailFilterItem): string | null {
  if (isActiveItem(item)) {
    if (item.kind !== 'periodic') return null

    return item.periodic?.serviceType ?? item.title
  }

  if (item.recordKind !== 'periodic') return null

  const detail = item.details.trim()

  if (!detail) return null

  return detail.split(' · ')[0]?.trim() ?? null
}

function buildServiceTypeChip(serviceType: string, onRemove: () => void): FilterChip {
  return {
    id: 'service-type',
    kind: 'category',
    label: `نوع سرویس: ${serviceType}`,
    onRemove
  }
}

type UseVehicleDetailFiltersOptions = {
  detailTab: 'active' | 'history' | 'transactions' | 'fuel'
  activeItems: VehicleActiveListItem[]
  historyItems: HistoryWithRow[]
  serviceTypeSeed?: string[]
}

export function useVehicleDetailFilters({
  detailTab,
  activeItems,
  historyItems,
  serviceTypeSeed = []
}: UseVehicleDetailFiltersOptions) {
  const isActiveTab = detailTab === 'active'
  const isHistoryTab = detailTab === 'history'
  const items: VehicleDetailFilterItem[] = isActiveTab
    ? activeItems
    : isHistoryTab
    ? historyItems
    : []

  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [draftServiceTypeFilter, setDraftServiceTypeFilter] = useState('all')

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

  const serviceTypeOptions = useMemo(() => {
    const options = new Set<string>(serviceTypeSeed)

    for (const item of items) {
      const serviceType = getItemServiceType(item)

      if (serviceType) options.add(serviceType)
    }

    return [...options].sort((a, b) => a.localeCompare(b, 'fa'))
  }, [items, serviceTypeSeed])

  const filteredItems = useMemo(() => {
    if (serviceTypeFilter === 'all') return filters.filteredItems

    return filters.filteredItems.filter(item => getItemServiceType(item) === serviceTypeFilter)
  }, [filters.filteredItems, serviceTypeFilter])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        ...filters.filterChips,
        serviceTypeFilter !== 'all' &&
          buildServiceTypeChip(serviceTypeFilter, () => setServiceTypeFilter('all'))
      ]),
    [filters.filterChips, serviceTypeFilter]
  )

  const openFilterModal = useCallback(() => {
    setDraftServiceTypeFilter(serviceTypeFilter)
    filters.openFilterModal()
  }, [filters, serviceTypeFilter])

  const clearDraftFilters = useCallback(() => {
    setDraftServiceTypeFilter('all')
    filters.clearDraftFilters()
  }, [filters])

  const applyFilters = useCallback(() => {
    setServiceTypeFilter(draftServiceTypeFilter)
    filters.applyFilters()
  }, [draftServiceTypeFilter, filters])

  const clearAllFilters = useCallback(() => {
    setServiceTypeFilter('all')
    setDraftServiceTypeFilter('all')
    filters.clearAllFilters()
  }, [filters])

  const hasActiveFilters = filters.hasActiveFilters || serviceTypeFilter !== 'all'

  const previousTabRef = useRef(detailTab)

  useEffect(() => {
    if (previousTabRef.current === detailTab) return

    previousTabRef.current = detailTab
    clearAllFilters()
    clearDraftFilters()
  }, [detailTab, clearAllFilters, clearDraftFilters])

  return {
    ...filters,
    filteredItems,
    filterChips,
    hasActiveFilters,
    openFilterModal,
    clearDraftFilters,
    applyFilters,
    clearAllFilters,
    draftServiceTypeFilter,
    setDraftServiceTypeFilter,
    serviceTypeOptions
  }
}

export type { VehicleDetailFilterItem }
