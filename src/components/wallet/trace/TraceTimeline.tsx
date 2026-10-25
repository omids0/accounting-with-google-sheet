import type { TraceReport } from '../../../services/walletTraceTypes'
import { formatJalaliMonthLabel } from '../../../utils/dateRange'
import CalmBlock from '../../CalmBlock'
import MoneyText from '../../MoneyText'
import {
  calmBarClass,
  calmBarTrackClass,
  calmListClass,
  calmNoteClass
} from '../../ui/calmListStyles'

const rowClass = 'border-t border-border py-2 first:border-t-0'
const headClass = 'flex items-baseline justify-between gap-3 text-[0.8rem]'

/** Month by month: where the difference was born, so the search can start in the right month. */
export default function TraceTimeline({ report }: { report: TraceReport }) {
  const months = report.timeline.filter(month => month.count > 0)

  // Three findings in one or two months: the list already says it all.
  if (report.findings.length < 4 || months.length < 2) return null

  const largest = Math.max(1, ...months.map(month => Math.abs(month.effect)))

  return (
    <CalmBlock title="اختلاف ماه‌به‌ماه">
      <ul className={calmListClass}>
        {months.map(month => (
          <li key={month.monthKey} className={rowClass}>
            <div className={headClass}>
              <span className="font-semibold">
                {formatJalaliMonthLabel(month.monthKey)}
                {month.monthKey === report.originMonthKey ? (
                  <span className="ms-1.5 text-[0.7rem] font-medium text-danger">شروع اختلاف</span>
                ) : null}
              </span>
              <span className="font-numeric font-bold tabular-nums">
                <MoneyText amount={month.effect} signed="plus" />
              </span>
            </div>
            <div className={calmBarTrackClass} aria-hidden="true">
              <div
                className={calmBarClass}
                style={{
                  transform: `scaleX(${Math.abs(month.effect) / largest})`,
                  background: 'var(--color-primary)'
                }}
              />
            </div>
          </li>
        ))}
        {report.undated ? (
          <li className={rowClass}>
            <div className={headClass}>
              <span className="font-semibold">تاریخ نامشخص یا قبل از ماه شروع</span>
              <span className="font-numeric font-bold tabular-nums">
                <MoneyText amount={report.undated} signed="plus" />
              </span>
            </div>
          </li>
        ) : null}
      </ul>
      <p className={calmNoteClass}>
        هر ماه، سهمِ موردهای همان ماه از اختلاف است؛ ماه‌هایی که چیزی در آن‌ها پیدا نشد نمایش داده
        نمی‌شوند.
      </p>
    </CalmBlock>
  )
}
