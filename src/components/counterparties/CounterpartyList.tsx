import CounterpartyCard from './CounterpartyCard'
import type { CounterpartyWithRow } from './types'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import { listCardsContainerClass } from '../ui/featureCardStyles'

type CounterpartyListProps = {
  items: CounterpartyWithRow[]
  filteredItems: CounterpartyWithRow[]
  onView: (item: CounterpartyWithRow) => void
  onEdit: (item: CounterpartyWithRow) => void
  onDelete: (item: CounterpartyWithRow) => void
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
}

export default function CounterpartyList({
  items,
  filteredItems,
  onView,
  onEdit,
  onDelete,
  onAdd
}: CounterpartyListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="counterparties"
        message="هنوز طرف حسابی ثبت نشده"
        action={onAdd ? { label: 'افزودن طرف حساب', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <div className={listCardsContainerClass}>
      {filteredItems.map(item => (
        <CounterpartyCard
          key={item.id}
          item={item}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
