import { useCallback, useEffect, useMemo, useState } from 'react'

import { formatIranPlateLabel } from './iranPlateUtils'
import type { VehicleProfileWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'
import { compactFilterChips } from '../../utils/filterChips'
import {
  clampMileageRange,
  createFullMileageRange,
  formatMileageRangeChipLabel,
  isFullMileageRange,
  resolveMileageSliderMax,
  type MileageRangeValue
} from '../../utils/mileageRange'
import type { FilterChip } from '../ActiveFilterChips'

type UseVehiclesFiltersOptions = {
  items: VehicleProfileWithRow[]
  actionCountById: Record<string, number>
}

export function useVehiclesFilters({ items, actionCountById }: UseVehiclesFiltersOptions) {
  const sampleMileages = useMemo(() => items.map(item => item.mileage), [items])

  const mileageSliderMax = useMemo(() => resolveMileageSliderMax(sampleMileages), [sampleMileages])

  const [mileageRange, setMileageRange] = useState<MileageRangeValue>(() =>
    createFullMileageRange(mileageSliderMax)
  )
  const [draftMileageRange, setDraftMileageRange] = useState<MileageRangeValue>(() =>
    createFullMileageRange(mileageSliderMax)
  )

  useEffect(() => {
    const syncRange = (current: MileageRangeValue) => {
      if (isFullMileageRange(current, current.max)) {
        return createFullMileageRange(mileageSliderMax)
      }

      return clampMileageRange(current, mileageSliderMax)
    }

    setMileageRange(syncRange)
    setDraftMileageRange(syncRange)
  }, [mileageSliderMax])

  const base = useListFilters({
    items,
    getSearchParts: item => [
      item.title,
      item.plate ? formatIranPlateLabel(item.plate) : '',
      item.vin,
      item.buildYear,
      item.capacity,
      item.mileage
    ],
    isSettled: item => (actionCountById[item.id] ?? 0) === 0,
    paymentStatusLabels: { paid: 'بدون اقدام', unpaid: 'نیاز به اقدام' }
  })

  const filteredItems = useMemo(() => {
    if (isFullMileageRange(mileageRange, mileageSliderMax)) {
      return base.filteredItems
    }

    return base.filteredItems.filter(item => {
      if (item.mileage < mileageRange.min) return false
      if (item.mileage > mileageRange.max) return false

      return true
    })
  }, [base.filteredItems, mileageRange, mileageSliderMax])

  const filterChips = useMemo(() => {
    const rangeLabel = formatMileageRangeChipLabel(mileageRange, mileageSliderMax)
    const mileageChip: FilterChip | null = rangeLabel
      ? {
          id: 'mileage-range',
          kind: 'other',
          label: rangeLabel,
          onRemove: () => {
            const cleared = createFullMileageRange(mileageSliderMax)
            setMileageRange(cleared)
            setDraftMileageRange(cleared)
          }
        }
      : null

    return compactFilterChips([...base.filterChips, mileageChip])
  }, [base.filterChips, mileageRange, mileageSliderMax])

  const openFilterModal = useCallback(() => {
    setDraftMileageRange(mileageRange)
    base.openFilterModal()
  }, [base, mileageRange])

  const clearDraftFilters = useCallback(() => {
    setDraftMileageRange(createFullMileageRange(mileageSliderMax))
    base.clearDraftFilters()
  }, [base, mileageSliderMax])

  const applyFilters = useCallback(() => {
    setMileageRange(clampMileageRange(draftMileageRange, mileageSliderMax))
    base.applyFilters()
  }, [base, draftMileageRange, mileageSliderMax])

  const clearAllFilters = useCallback(() => {
    const cleared = createFullMileageRange(mileageSliderMax)
    setMileageRange(cleared)
    setDraftMileageRange(cleared)
    base.clearAllFilters()
  }, [base, mileageSliderMax])

  const hasActiveFilters =
    base.hasActiveFilters || !isFullMileageRange(mileageRange, mileageSliderMax)

  return {
    ...base,
    filteredItems,
    filterChips,
    hasActiveFilters,
    openFilterModal,
    clearDraftFilters,
    applyFilters,
    clearAllFilters,
    draftMileageRange,
    setDraftMileageRange,
    mileageSliderMax
  }
}
