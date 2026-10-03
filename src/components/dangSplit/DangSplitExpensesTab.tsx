import DangSplitExpenseCard from './DangSplitExpenseCard'
import { dangSplitToolbarClass } from './dangSplitStyles'
import type { DangSplitExpenseWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
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
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="records" />
        </div>
        <p>هنوز هزینه‌ای ثبت نشده</p>
        <Button type="button" variant="primary" size="sm" onClick={onAdd}>
          افزودن هزینه
        </Button>
      </div>
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
