import DashboardEmptyRecords from './DashboardEmptyRecords'
import type { DashboardRecord } from '../../types'
import { cn } from '../../utils/cn'
import { formatSignedMoney } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import DayBadge from '../DayBadge'
import {
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

export const DASHBOARD_RECENT_LIMIT = 5

/** «تراکنش‌های اخیر»: the latest five records of the period. */
export default function DashboardRecentBlock({
  records,
  onViewAll,
  onShowPreviousMonth
}: {
  records: DashboardRecord[]
  onViewAll: () => void
  onShowPreviousMonth: () => void
}) {
  const rows = records.slice(0, DASHBOARD_RECENT_LIMIT)

  return (
    <CalmBlock
      title="تراکنش‌های اخیر"
      action={rows.length ? { label: 'همه ←', onClick: onViewAll } : undefined}
    >
      {!rows.length ? (
        <DashboardEmptyRecords onShowPreviousMonth={onShowPreviousMonth} />
      ) : (
        <ul className={calmListClass}>
          {rows.map((record, index) => (
            <li key={`${record.date}-${index}`} className={calmRowClass}>
              <DayBadge date={record.date} />
              <span className={calmRowMainClass}>
                <span className={calmRowTitleClass}>{record.title}</span>
                <span className={calmRowSubClass}>
                  {[record.category, record.account].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span
                className={cn(
                  calmRowEndClass,
                  record.type === 'income' ? 'text-success' : 'text-danger'
                )}
              >
                {formatSignedMoney(
                  record.type === 'expense' ? -Math.abs(record.amount) : Math.abs(record.amount),
                  { showPlus: true }
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CalmBlock>
  )
}
