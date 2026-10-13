import { useNavigate } from 'react-router'

import DashboardEmptyRecords from './DashboardEmptyRecords'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { recordOpenPath } from '../../routes/paths'
import type { DashboardRecord } from '../../types'
import { cn } from '../../utils/cn'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { normalizeSheetDate } from '../../utils/sheetValues'
import CalmBlock from '../CalmBlock'
import DayBadge from '../DayBadge'
import MoneyText from '../MoneyText'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import {
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'
import WriterAvatar from '../WriterAvatar'

export const DASHBOARD_RECENT_LIMIT = 5

const signedAmount = (record: DashboardRecord) =>
  record.type === 'expense' ? -Math.abs(record.amount) : Math.abs(record.amount)

const amountToneClass = (record: DashboardRecord) =>
  record.type === 'income' ? 'text-success' : 'text-danger'

const openButtonClass =
  'flex w-full min-w-0 cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 text-start'

/** Desktop: the same five rows as a table (تاریخ · عنوان · دسته · حساب · مبلغ). */
const recentColumns = (
  open: (record: DashboardRecord) => void
): DataTableColumn<DashboardRecord>[] => [
  {
    id: 'date',
    header: 'تاریخ',
    cell: record => formatIsoDatePersian(normalizeSheetDate(record.date) || record.date),
    className: 'whitespace-nowrap text-muted'
  },
  {
    id: 'title',
    header: 'عنوان',
    cell: record => (
      <>
        <WriterAvatar email={record.writer} />
        {record.id ? (
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-0 font-semibold text-text hover:underline"
            onClick={() => open(record)}
          >
            {record.title}
          </button>
        ) : (
          record.title
        )}
      </>
    ),
    className: 'font-semibold'
  },
  { id: 'category', header: 'دسته', cell: record => record.category || '—' },
  { id: 'account', header: 'حساب', cell: record => record.account || '—' },
  {
    id: 'amount',
    header: 'مبلغ',
    numeric: true,
    cell: record => (
      <span className={amountToneClass(record)}>
        <MoneyText amount={signedAmount(record)} signed="plus" />
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
  const navigate = useNavigate()
  const open = (record: DashboardRecord) => {
    if (record.id) navigate(recordOpenPath(record.type, record.id))
  }
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
          columns={recentColumns(open)}
          rowKey={record => `${record.date}-${rows.indexOf(record)}`}
          bare
        />
      ) : (
        <ul className={calmListClass}>
          {rows.map((record, index) => (
            <li key={`${record.date}-${index}`} className={calmRowClass}>
              <button
                type="button"
                className={openButtonClass}
                onClick={() => open(record)}
                disabled={!record.id}
              >
                <DayBadge date={record.date} />
                <span className={calmRowMainClass}>
                  <span className={calmRowTitleClass}>
                    <WriterAvatar email={record.writer} />
                    {record.title}
                  </span>
                  <span className={calmRowSubClass}>
                    {[record.category, record.account].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={cn(calmRowEndClass, amountToneClass(record))}>
                  <MoneyText amount={signedAmount(record)} signed="plus" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </CalmBlock>
  )
}
