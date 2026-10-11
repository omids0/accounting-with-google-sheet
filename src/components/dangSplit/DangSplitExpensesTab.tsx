import DangSplitExpenseCard from './DangSplitExpenseCard'
import { dangSplitToolbarClass } from './dangSplitStyles'
import type { DangSplitExpenseWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import EmptyState from '../EmptyState'
import { listCardsContainerClass } from '../ui/featureCardStyles'

export default function DangSplitExpensesTab({
  expenses,
  allocationsByExpense,
  peopleById,
  onAdd,
  onAllocate,
  onEdit,
  onDelete
}: {
  expenses: DangSplitExpenseWithRow[]
  allocationsByExpense: Map<string, DangSplitAllocationWithRow[]>
  peopleById: Map<string, DangSplitPersonWithRow>
  onAdd: () => void
  onAllocate: (item: DangSplitExpenseWithRow) => void
  onEdit: (item: DangSplitExpenseWithRow) => void
  onDelete: (item: DangSplitExpenseWithRow) => void
}) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="records"
        description="هر خرید مشترک را این‌جا ثبت کن تا سهم هر نفر حساب شود."
        message="هنوز هزینه‌ای ثبت نشده"
        action={{ label: 'افزودن هزینه', onClick: onAdd }}
      />
    )
  }

  return (
    <div className={dangSplitToolbarClass}>
      <div className={listCardsContainerClass}>
        {expenses.map(item => (
          <DangSplitExpenseCard
            key={item.id}
            item={item}
            allocations={allocationsByExpense.get(item.id) ?? []}
            peopleById={peopleById}
            onAllocate={onAllocate}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
