import PersonalReminderCard from './PersonalReminderCard'
import type { PersonalReminderWithRow } from './types'
import AppIcon from '../AppIcon'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

type PersonalReminderListProps = {
  items: PersonalReminderWithRow[]
  filteredItems: PersonalReminderWithRow[]
  loading: boolean
  completingId: string
  onComplete: (item: PersonalReminderWithRow) => void
  onEdit: (item: PersonalReminderWithRow) => void
  onDelete: (item: PersonalReminderWithRow) => void
}

export default function PersonalReminderList({
  items,
  filteredItems,
  loading,
  completingId,
  onComplete,
  onEdit,
  onDelete
}: PersonalReminderListProps) {
  if (loading && items.length === 0) {
    return <DangCardListSkeleton />
  }

  if (items.length === 0) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="bell" />
        </div>
        <p>هنوز یادآوری ثبت نشده</p>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <>
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
    </>
  )
}
