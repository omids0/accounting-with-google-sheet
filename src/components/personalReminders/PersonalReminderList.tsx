import PersonalReminderCard from './PersonalReminderCard'
import type { PersonalReminderWithRow } from './types'
import { InstallmentCardListSkeleton } from '../skeleton'
import { emptyStateClass, emptyTextClass } from '../ui/displayStyles'

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
  if (loading) {
    return <InstallmentCardListSkeleton count={3} />
  }

  if (!items.length) {
    return (
      <div className={emptyStateClass}>
        <p className={emptyTextClass}>هنوز یادآوری شخصی ثبت نشده است.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
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
    </div>
  )
}
