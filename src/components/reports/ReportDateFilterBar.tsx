import { useEffect, useMemo, useState } from 'react'

import {
  formatDateRangeLabel,
  resolveDateRange,
  type RecordsDatePreset
} from '../../utils/dateRange'
import { buildDateRangeChip, compactFilterChips } from '../../utils/filterChips'
import type { DateRange } from '../../utils/jalaliDate'
import type { FilterChip } from '../ActiveFilterChips'
import ActiveFilterChips from '../ActiveFilterChips'
import {
  createDefaultDateRangeFilter,
  type AppliedDateRangeFilter,
  type DateRangeFilterPreset
} from '../DateRangeFilter'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import Button from '../ui/Button'
import { recordsRefreshBtnClass } from '../ui/recordsStyles'
import {
  reportFilterBarClass,
  reportMetaBarClass,
  reportMetaSubtitleClass
} from '../ui/toolsPageStyles'

type ReportDateFilterBarProps = {
  preset: RecordsDatePreset
  customRange: DateRange
  onFilterChange: (filter: AppliedDateRangeFilter) => void
  onRefresh: () => void
  loading?: boolean
  dateIncludeAll?: boolean
  dateLabel?: string
  showDateFilter?: boolean
  extraChips?: FilterChip[]
  filterModalChildren?: React.ReactNode
}

export function ReportDateFilterBar({
  preset,
  customRange,
  onFilterChange,
  onRefresh,
  loading = false,
  dateIncludeAll,
  dateLabel,
  showDateFilter = true,
  extraChips = [],
  filterModalChildren
}: ReportDateFilterBarProps) {
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftPreset, setDraftPreset] = useState<DateRangeFilterPreset>(preset)
  const [draftRange, setDraftRange] = useState(customRange)

  useEffect(() => {
    setDraftPreset(preset)
    setDraftRange(customRange)
  }, [preset, customRange.start, customRange.end])

  const filterChips = useMemo(() => {
    const chips: Array<FilterChip | null> = [...extraChips]

    if (showDateFilter) {
      chips.unshift(
        buildDateRangeChip(formatDateRangeLabel(resolveDateRange(preset, customRange)), () =>
          onFilterChange(createDefaultDateRangeFilter())
        )
      )
    }

    return compactFilterChips(chips)
  }, [customRange.end, customRange.start, extraChips, onFilterChange, preset, showDateFilter])

  const applyFilters = () => {
    if (showDateFilter) {
      onFilterChange({ preset: draftPreset, customRange: draftRange })
    }
    setFilterModalOpen(false)
  }

  const clearDraftFilters = () => {
    const defaults = createDefaultDateRangeFilter()
    setDraftPreset(defaults.preset)
    setDraftRange(defaults.customRange)
    if (showDateFilter) {
      onFilterChange(defaults)
    }
    setFilterModalOpen(false)
  }

  return (
    <>
      <div className={reportFilterBarClass}>
        <ActiveFilterChips
          chips={filterChips}
          onOpenFilters={() => setFilterModalOpen(true)}
          onClearAll={clearDraftFilters}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={recordsRefreshBtnClass}
          onClick={onRefresh}
          disabled={loading}
          loading={loading}
          aria-label="بارگذاری مجدد"
        >
          ↻
        </Button>
      </div>

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={applyFilters}
        onClear={clearDraftFilters}
      >
        {showDateFilter ? (
          <PageFilterPanel
            showSearch={false}
            datePreset={draftPreset}
            customRange={draftRange}
            onDateFilterChange={filter => {
              setDraftPreset(filter.preset)
              setDraftRange(filter.customRange)
            }}
            dateIncludeAll={dateIncludeAll}
            dateLabel={dateLabel}
            dateLoading={loading}
          >
            {filterModalChildren}
          </PageFilterPanel>
        ) : (
          filterModalChildren
        )}
      </FilterModal>
    </>
  )
}

type ReportStaticMetaBarProps = {
  subtitle: string
  onRefresh: () => void
  loading?: boolean
}

export function ReportStaticMetaBar({
  subtitle,
  onRefresh,
  loading = false
}: ReportStaticMetaBarProps) {
  return (
    <div className={reportMetaBarClass}>
      <p className={reportMetaSubtitleClass}>{subtitle}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={recordsRefreshBtnClass}
        onClick={onRefresh}
        disabled={loading}
        loading={loading}
        aria-label="بارگذاری مجدد"
      >
        ↻
      </Button>
    </div>
  )
}

export default ReportDateFilterBar
