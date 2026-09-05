import { useCallback, useMemo, useState } from 'react'

import { cn } from '../../utils/cn'
import {
  formatDateRangeLabel,
  resolveDateRange,
  type RecordsDatePreset
} from '../../utils/dateRange'
import type { DateRange } from '../../utils/jalaliDate'
import DateRangeFilter, {
  createDefaultDateRangeFilter,
  type AppliedDateRangeFilter
} from '../DateRangeFilter'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  recordsRefreshBtnClass,
  recordsToolbarClass,
  recordsToolbarHeaderClass,
  recordsToolbarHeadingClass,
  recordsToolbarRangeClass,
  recordsToolbarTitleClass
} from '../ui/recordsStyles'

interface ReportToolbarProps {
  title: string
  preset: RecordsDatePreset
  customRange: DateRange
  onFilterChange: (filter: AppliedDateRangeFilter) => void
  onRefresh: () => void
  loading?: boolean
  showDateFilter?: boolean
  subtitle?: string
}

export default function ReportToolbar({
  title,
  preset,
  customRange,
  onFilterChange,
  onRefresh,
  loading = false,
  showDateFilter = true,
  subtitle
}: ReportToolbarProps) {
  const dateRange = resolveDateRange(preset, customRange)

  return (
    <Card className={cn(recordsToolbarClass, 'dashboard-toolbar')}>
      <div className={recordsToolbarHeaderClass}>
        <div className={recordsToolbarHeadingClass}>
          <h2 className={recordsToolbarTitleClass}>{title}</h2>
          <p className={recordsToolbarRangeClass}>
            {subtitle ?? (showDateFilter ? formatDateRangeLabel(dateRange) : '')}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={recordsRefreshBtnClass}
          onClick={onRefresh}
          disabled={loading}
          aria-label="بارگذاری مجدد"
        >
          {loading ? '...' : '↻'}
        </Button>
      </div>

      {showDateFilter && (
        <DateRangeFilter
          preset={preset}
          customRange={customRange}
          onChange={onFilterChange}
          loading={loading}
        />
      )}
    </Card>
  )
}

export function useReportDateFilter() {
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date')

  const [customRange, setCustomRange] = useState(() => createDefaultDateRangeFilter().customRange)

  const handleDateFilterChange = useCallback((filter: AppliedDateRangeFilter) => {
    if (filter.preset === 'all') return
    setDatePreset(filter.preset)
    setCustomRange(filter.customRange)
  }, [])

  const dateRange = useMemo(
    () => resolveDateRange(datePreset, customRange),
    [datePreset, customRange.start, customRange.end]
  )

  return {
    datePreset,
    customRange,
    handleDateFilterChange,
    dateRange
  }
}
