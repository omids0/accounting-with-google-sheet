import { useMemo } from 'react'

import { useIsDesktop } from '../../hooks/useMediaQuery'
import { CHECKS_SHEET, totalChecksInRange, totalUnpaidChecksInRange } from '../../services/checks'
import {
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey
} from '../../utils/dateRange'
import { getTodayIso } from '../../utils/jalaliDate'
import { distributionSparkline } from '../../utils/sparklineData'
import AttachmentBadge from '../attachments/AttachmentBadge'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import CheckCard from './CheckCard'
import type { CheckWithRow } from './types'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { checkboxColumn, dateColumn, moneyColumn, textColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
import { dashboardStatGridClass } from '../ui/chartStyles'
import { listCardsContainerClass } from '../ui/featureCardStyles'

export type CheckListProps = {
  items: CheckWithRow[]
  filteredItems: CheckWithRow[]
  loading: boolean
  togglingId: string
  onTogglePaid: (item: CheckWithRow, paid: boolean) => void
  onEdit: (item: CheckWithRow) => void
  onDelete: (item: CheckWithRow) => void
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
}

export default function CheckList({
  items,
  filteredItems,
  loading,
  togglingId,
  onTogglePaid,
  onEdit,
  onDelete,
  onAdd
}: CheckListProps) {
  const isDesktop = useIsDesktop()
  const monthRange = useMemo(() => getInstallmentDueRange('month-to-date'), [])
  const monthLabel = useMemo(() => formatJalaliMonthLabel(getJalaliMonthKey(getTodayIso())), [])

  const monthTotals = useMemo(
    () => ({
      total: totalChecksInRange(filteredItems, monthRange),
      unpaid: totalUnpaidChecksInRange(filteredItems, monthRange)
    }),
    [filteredItems, monthRange]
  )

  const columns = useMemo<DataTableColumn<CheckWithRow>[]>(
    () => [
      checkboxColumn({
        header: 'پرداخت شد',
        checked: item => item.paid,
        disabled: item => togglingId === item.id,
        label: item => `پرداخت شد: چک ${item.checkNumber}`,
        onChange: onTogglePaid
      }),
      textColumn('number', 'شماره', item => item.checkNumber, true),
      textColumn('counterparty', 'طرف حساب', item => item.counterparty),
      dateColumn('created', 'صدور', item => item.creationDate),
      dateColumn('due', 'سررسید', item => item.dueDate),
      moneyColumn('amount', 'مبلغ', item => item.amount)
    ],
    [togglingId, onTogglePaid]
  )

  if (loading && items.length === 0) {
    return <DangCardListSkeleton footerStats={2} table />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="checks"
        description="چک‌های پرداختی و دریافتی‌ات را با تاریخ سررسید این‌جا مدیریت کن تا هیچ چکی از قلم نیفتد."
        message="هنوز چکی ثبت نشده"
        action={onAdd ? { label: 'افزودن چک', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <>
      {isDesktop ? (
        <DataTable
          label="چک‌ها"
          rows={filteredItems}
          columns={columns}
          rowKey={item => item.id}
          isMuted={item => item.paid}
          actions={item => (
            <>
              <AttachmentBadge
                sheetName={CHECKS_SHEET}
                entityId={item.id}
                fileIds={item.attachments}
                title={`چک ${item.checkNumber}`}
              />
              <TableRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </>
          )}
        />
      ) : (
        <div className={listCardsContainerClass}>
          {filteredItems.map(item => (
            <CheckCard
              key={item.id}
              item={item}
              togglingId={togglingId}
              onTogglePaid={onTogglePaid}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <div className={dashboardStatGridClass}>
        <StatCard
          label={`مجموع چک‌های ${monthLabel}`}
          amount={monthTotals.total}
          variant="default"
          tone="primary"
          sparklineData={distributionSparkline(filteredItems.map(item => item.amount))}
          animateIndex={0}
          lift
        />
        <StatCard
          label="پرداخت‌نشده تا پایان ماه"
          amount={monthTotals.unpaid}
          variant="expense"
          sparklineData={distributionSparkline(
            filteredItems.filter(item => !item.paid).map(item => item.amount)
          )}
          animateIndex={1}
          lift
        />
      </div>
    </>
  )
}
