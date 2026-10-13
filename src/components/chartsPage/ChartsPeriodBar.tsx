import { currentChartsPeriod } from './useChartsPage'
import type { ChartsPeriod } from '../../services/chartsData'
import { cx } from '../../utils/cn'
import {
  formatJalaliYear,
  nextJalaliMonthKey,
  parseJalaliMonthKey,
  previousJalaliMonthKey
} from '../../utils/dateRange'
import { formatJalaliMonthName } from '../../utils/periodLabel'
import AppIcon from '../AppIcon'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmSegmentClass } from '../ui/calmListStyles'

const MODE_OPTIONS = [
  { id: 'month', label: 'ماه' },
  { id: 'year', label: 'سال' }
]

const stepButtonClass = cx(
  'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-[1rem] text-text',
  'disabled:cursor-default disabled:opacity-40'
)

export function formatChartsPeriod(period: ChartsPeriod): string {
  if (period.mode === 'year') return formatJalaliYear(Number(period.key))

  const parts = parseJalaliMonthKey(period.key)

  return parts ? formatJalaliMonthName(parts.year, parts.month) : period.key
}

function stepPeriod(period: ChartsPeriod, delta: 1 | -1): ChartsPeriod {
  if (period.mode === 'year') return { mode: 'year', key: String(Number(period.key) + delta) }

  return {
    mode: 'month',
    key: delta > 0 ? nextJalaliMonthKey(period.key) : previousJalaliMonthKey(period.key)
  }
}

/** «ماه | سال» and a stepper for the shown month or year (never past the current one). */
export default function ChartsPeriodBar({
  period,
  onModeChange,
  onPeriodChange
}: {
  period: ChartsPeriod
  onModeChange: (mode: ChartsPeriod['mode']) => void
  onPeriodChange: (period: ChartsPeriod) => void
}) {
  const atLatest = period.key >= currentChartsPeriod(period.mode).key
  const label = formatChartsPeriod(period)

  return (
    <div className="flex items-center justify-between gap-2">
      <TransactionTypeSegment
        className={calmSegmentClass}
        options={MODE_OPTIONS}
        value={period.mode}
        onChange={id => onModeChange(id as ChartsPeriod['mode'])}
        ariaLabel="بازه نمودارها"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={stepButtonClass}
          onClick={() => onPeriodChange(stepPeriod(period, -1))}
          aria-label={period.mode === 'year' ? 'سال قبل' : 'ماه قبل'}
        >
          <AppIcon name="chevron-right" size={16} />
        </button>
        <span
          className="min-w-[5.5rem] text-center text-[0.82rem] font-semibold text-text"
          aria-live="polite"
        >
          {label}
        </span>
        <button
          type="button"
          className={stepButtonClass}
          onClick={() => onPeriodChange(stepPeriod(period, 1))}
          disabled={atLatest}
          aria-label={period.mode === 'year' ? 'سال بعد' : 'ماه بعد'}
        >
          <AppIcon name="chevron-left" size={16} />
        </button>
      </div>
    </div>
  )
}
