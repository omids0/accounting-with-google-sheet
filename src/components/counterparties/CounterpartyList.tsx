import CounterpartyCard from './CounterpartyCard'
import type { CounterpartyWithRow } from './types'
import AppIcon from '../AppIcon'
import SearchEmptyState from '../SearchEmptyState'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

type CounterpartyListProps = {
  items: CounterpartyWithRow[]
  filteredItems: CounterpartyWithRow[]
  onEdit: (item: CounterpartyWithRow) => void
  onDelete: (item: CounterpartyWithRow) => void
}

export default function CounterpartyList({
  items,
  filteredItems,
  onEdit,
  onDelete
}: CounterpartyListProps) {
  if (items.length === 0) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="counterparties" />
        </div>
        <p>هنوز طرف حسابی ثبت نشده</p>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <>
      {filteredItems.map(item => (
        <CounterpartyCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}
