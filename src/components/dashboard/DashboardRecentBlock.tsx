import DashboardEmptyRecords from './DashboardEmptyRecords'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import type { DashboardRecord } from '../../types'
import { cn } from '../../utils/cn'
import { formatSignedMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { normalizeSheetDate } from '../../utils/sheetValues'
import CalmBlock from '../CalmBlock'
import DayBadge from '../DayBadge'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import {
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

export const DASHBOARD_RECENT_LIMIT = 5

const signedAmount = (record: DashboardRecord) =>
  record.type === 'expense' ? -Math.abs(record.amount) : Math.abs(record.amount)

const amountToneClass = (record: DashboardRecord) =>
  record.type === 'income' ? 'text-success' : 'text-danger'

/** Desktop: the same five rows as a table (تاریخ · عنوان · دسته · حساب · مبلغ). */
const RECENT_COLUMNS: DataTableColumn<DashboardRecord>[] = [
  {
    id: 'date',
    header: 'تاریخ',
    cell: record => formatIsoDatePersian(normalizeSheetDate(record.date) || record.date),
    className: 'whitespace-nowrap text-muted'
  },
  { id: 'title', header: 'عنوان', cell: record => record.title, className: 'font-semibold' },
  { id: 'category', header: 'دسته', cell: record => record.category || '—' },
  { id: 'account', header: 'حساب', cell: record => record.account || '—' },
  {
    id: 'amount',
    header: 'مبلغ',
    numeric: true,
    cell: record => (
      <span className={amountToneClass(record)}>
        {formatSignedMoney(signedAmount(record), { showPlus: true })}
      </span>
    )
  }
]

/** «تراکنش‌های اخیر»: the latest five records of the period. */
export default function DashboardRecentBlock({
  records,
  onViewAll,
  onShowPreviousMonth,
  className
}: {
  records: DashboardRecord[]
  onViewAll: () => void
  onShowPreviousMonth: () => void
  className?: string
}) {
  const isDesktop = useIsDesktop()
  const rows = records.slice(0, DASHBOARD_RECENT_LIMIT)

  return (
    <CalmBlock
      className={className}
      title="تراکنش‌های اخیر"
      action={rows.length ? { label: 'همه ←', onClick: onViewAll } : undefined}
    >
      {!rows.length ? (
        <DashboardEmptyRecords onShowPreviousMonth={onShowPreviousMonth} />
      ) : isDesktop ? (
        <DataTable
          label="تراکنش‌های اخیر"
          rows={rows}
          columns={RECENT_COLUMNS}
          rowKey={record => `${record.date}-${rows.indexOf(record)}`}
          bare
        />
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
              <span className={cn(calmRowEndClass, amountToneClass(record))}>
                {formatSignedMoney(signedAmount(record), { showPlus: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CalmBlock>
  )
}
