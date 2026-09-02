import { useMemo } from 'react'

import { totalChecksInRange, totalUnpaidChecksInRange } from '../../services/checks'
import {
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey
} from '../../utils/dateRange'
import { getTodayIso } from '../../utils/jalaliDate'
import { distributionSparkline } from '../../utils/sparklineData'
import AppIcon from '../AppIcon'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import CheckCard from './CheckCard'
import type { CheckWithRow } from './types'

export type CheckListProps = {
  items: CheckWithRow[]
  filteredItems: CheckWithRow[]
  loading: boolean
  togglingId: string
  onTogglePaid: (item: CheckWithRow, paid: boolean) => void
  onEdit: (item: CheckWithRow) => void
  onDelete: (item: CheckWithRow) => void
}

export default function CheckList({
  items,
  filteredItems,
  loading,
  togglingId,
  onTogglePaid,
  onEdit,
  onDelete
}: CheckListProps) {
  const monthRange = useMemo(() => getInstallmentDueRange('month-to-date'), [])
  const monthLabel = useMemo(() => formatJalaliMonthLabel(getJalaliMonthKey(getTodayIso())), [])

  const monthTotals = useMemo(
    () => ({
      total: totalChecksInRange(items, monthRange),
      unpaid: totalUnpaidChecksInRange(items, monthRange)
    }),
    [items, monthRange]
  )

  if (loading && items.length === 0) {
    return <DangCardListSkeleton />
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="checks" />
        </div>
        <p>هنوز چکی ثبت نشده</p>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <>
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

      <div className="stat-grid dashboard-stat-grid">
        <StatCard
          label={`مجموع چک‌های ${monthLabel}`}
          amount={monthTotals.total}
          variant="default"
          tone="primary"
          sparklineData={distributionSparkline(items.map(item => item.amount))}
          animateIndex={0}
          lift
        />
        <StatCard
          label="پرداخت‌نشده تا پایان ماه"
          amount={monthTotals.unpaid}
          variant="expense"
          sparklineData={distributionSparkline(
            items.filter(item => !item.paid).map(item => item.amount)
          )}
          animateIndex={1}
          lift
        />
      </div>
    </>
  )
}
