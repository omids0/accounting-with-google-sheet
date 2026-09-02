import { unpaidDangTotal } from '../../services/dang'
import { distributionSparkline } from '../../utils/sparklineData'
import AppIcon from '../AppIcon'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import DangCard from './DangCard'
import type { DangWithRow } from './types'

export type DangListProps = {
  items: DangWithRow[]
  filteredItems: DangWithRow[]
  loading: boolean
  expandedId: string | null
  togglingId: string
  savingAmountId: string
  amountEdits: Record<string, number | ''>
  onExpand: (id: string | null) => void
  onTogglePaid: (item: DangWithRow, paid: boolean) => void
  onAmountChange: (item: DangWithRow, value: number | '') => void
  onAmountBlur: (item: DangWithRow) => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
}

export default function DangList({
  items,
  filteredItems,
  loading,
  expandedId,
  togglingId,
  savingAmountId,
  amountEdits,
  onExpand,
  onTogglePaid,
  onAmountChange,
  onAmountBlur,
  onEdit,
  onDelete
}: DangListProps) {
  if (loading && items.length === 0) {
    return <DangCardListSkeleton />
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="debt" />
        </div>
        <p>هنوز بدهی ثبت نشده</p>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  const totalUnpaid = unpaidDangTotal(items)

  return (
    <>
      {filteredItems.map(item => (
        <DangCard
          key={item.id}
          item={item}
          expanded={expandedId === item.id}
          togglingId={togglingId}
          savingAmountId={savingAmountId}
          amountEdits={amountEdits}
          onTogglePaid={onTogglePaid}
          onExpand={onExpand}
          onAmountChange={onAmountChange}
          onAmountBlur={onAmountBlur}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {totalUnpaid > 0 && (
        <StatCard
          label="مانده پرداخت نشده"
          amount={totalUnpaid}
          variant="expense"
          wide
          sparklineData={distributionSparkline(
            items.filter(item => !item.paid).map(item => item.amount)
          )}
          className="dang-total-footer"
        />
      )}
    </>
  )
}
