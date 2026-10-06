import PersonalReminderCard from './PersonalReminderCard'
import type { PersonalReminderWithRow } from './types'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import { listCardsContainerClass } from '../ui/featureCardStyles'

type PersonalReminderListProps = {
  items: PersonalReminderWithRow[]
  filteredItems: PersonalReminderWithRow[]
  loading: boolean
  completingId: string
  onComplete: (item: PersonalReminderWithRow) => void
  onEdit: (item: PersonalReminderWithRow) => void
  onDelete: (item: PersonalReminderWithRow) => void
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
}

export default function PersonalReminderList({
  items,
  filteredItems,
  loading,
  completingId,
  onComplete,
  onEdit,
  onDelete,
  onAdd
}: PersonalReminderListProps) {
  if (loading && items.length === 0) {
    return <DangCardListSkeleton />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="bell"
        message="هنوز یادآوری ثبت نشده"
        action={onAdd ? { label: 'افزودن یادآوری', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <div className={listCardsContainerClass}>
      {filteredItems.map(item => (
        <PersonalReminderCard
          key={item.id}
          item={item}
          completing={completingId === item.id}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
