import { unpaidDangTotal } from '../../services/dang'
import { distributionSparkline } from '../../utils/sparklineData'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import DangCard from './DangCard'
import type { DangWithRow } from './types'
import { dangTotalFooterClass, listCardsContainerClass } from '../ui/featureCardStyles'

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
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
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
  onDelete,
  onAdd
}: DangListProps) {
  if (loading && items.length === 0) {
    return <DangCardListSkeleton />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="debt"
        message="هنوز بدهی ثبت نشده"
        action={onAdd ? { label: 'افزودن بدهی', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  const totalUnpaid = unpaidDangTotal(filteredItems)

  return (
    <>
      <div className={listCardsContainerClass}>
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
      </div>

      {totalUnpaid > 0 && (
        <StatCard
          label="مانده پرداخت نشده"
          amount={totalUnpaid}
          variant="expense"
          wide
          sparklineData={distributionSparkline(
            filteredItems.filter(item => !item.paid).map(item => item.amount)
          )}
          className={dangTotalFooterClass}
        />
      )}
    </>
  )
}
