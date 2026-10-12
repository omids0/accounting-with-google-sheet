import { useMemo } from 'react'

import PersonalReminderCard from './PersonalReminderCard'
import type { PersonalReminderWithRow } from './types'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { getPersonalReminderRecurrenceLabel } from '../../services/personalReminders'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { checkboxColumn, dateColumn, moneyColumn, textColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
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
  const isDesktop = useIsDesktop()
  const columns = useMemo<DataTableColumn<PersonalReminderWithRow>[]>(
    () => [
      checkboxColumn({
        header: 'انجام شد',
        checked: item => !item.enabled,
        disabled: item => !item.enabled || completingId === item.id,
        label: item => (item.enabled ? `ثبت انجام ${item.title}` : 'انجام شده'),
        onChange: (item, checked) => {
          if (item.enabled && checked) onComplete(item)
        }
      }),
      textColumn('title', 'عنوان', item => item.title, true),
      textColumn('category', 'دسته', item => item.category),
      textColumn('recurrence', 'تکرار', item =>
        getPersonalReminderRecurrenceLabel(item.recurrence)
      ),
      dateColumn('due', 'موعد', item => item.dueDate),
      moneyColumn('amount', 'مبلغ', item => item.amount)
    ],
    [completingId, onComplete]
  )

  if (loading && items.length === 0) {
    return <DangCardListSkeleton table />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="bell"
        description="قبض، بیمه و موعدهای شخصی را ثبت کن تا سر وقت اعلان بگیری."
        message="هنوز یادآوری ثبت نشده"
        action={onAdd ? { label: 'افزودن یادآوری', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  if (isDesktop) {
    return (
      <DataTable
        label="یادآوری‌ها"
        rows={filteredItems}
        columns={columns}
        rowKey={item => item.id}
        isMuted={item => !item.enabled}
        actions={item => (
          <TableRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
        )}
      />
    )
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
