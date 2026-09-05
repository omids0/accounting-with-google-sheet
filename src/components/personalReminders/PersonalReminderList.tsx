import PersonalReminderCard from './PersonalReminderCard'
import type { PersonalReminderWithRow } from './types'
import AppIcon from '../AppIcon'
import { DangCardListSkeleton } from '../skeleton'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

type PersonalReminderListProps = {
  items: PersonalReminderWithRow[]
  loading: boolean
  completingId: string
  onComplete: (item: PersonalReminderWithRow) => void
  onEdit: (item: PersonalReminderWithRow) => void
  onDelete: (item: PersonalReminderWithRow) => void
}

export default function PersonalReminderList({
  items,
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

  return (
    <>
      {items.map(item => (
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
