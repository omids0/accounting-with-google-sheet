import { currentChartsPeriod } from './useChartsPage'
import type { ChartsPeriod } from '../../services/chartsData'
import {
  formatJalaliYear,
  nextJalaliMonthKey,
  parseJalaliMonthKey,
  previousJalaliMonthKey
} from '../../utils/dateRange'
import { formatJalaliMonthName } from '../../utils/periodLabel'
import PeriodStepper from '../PeriodStepper'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmSegmentClass } from '../ui/calmListStyles'

const MODE_OPTIONS = [
  { id: 'month', label: 'ماه' },
  { id: 'year', label: 'سال' }
]

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
      <PeriodStepper
        label={label}
        onPrevious={() => onPeriodChange(stepPeriod(period, -1))}
        onNext={() => onPeriodChange(stepPeriod(period, 1))}
        nextDisabled={atLatest}
        previousLabel={period.mode === 'year' ? 'سال قبل' : 'ماه قبل'}
        nextLabel={period.mode === 'year' ? 'سال بعد' : 'ماه بعد'}
      />
    </div>
  )
}
