import { useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import PersonalReminderFormModal from './PersonalReminderFormModal'
import PersonalReminderList from './PersonalReminderList'
import type { PersonalRemindersPageProps } from './types'
import { usePersonalRemindersData } from './usePersonalRemindersData'
import { usePersonalRemindersForm } from './usePersonalRemindersForm'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

export default function PersonalRemindersPage({ active = true }: PersonalRemindersPageProps) {
  const data = usePersonalRemindersData()
  const form = usePersonalRemindersForm({ onSaved: data.loadItems })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات یادآوری',
      actions: createPageSpeedDialActions({
        onAdd: () => form.openCreateForm(),
        onRefresh: data.loadItems,
        refreshDisabled: data.loading
      })
    }),
    [data.loadItems, data.loading, form.openCreateForm]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="bell" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
      <PersonalReminderList
        items={data.items}
        loading={data.loading}
        completingId={data.completingId}
        onComplete={data.openCompleteConfirm}
        onEdit={form.openEditForm}
        onDelete={data.openDeleteConfirm}
      />

      <PersonalReminderFormModal
        open={form.showForm}
        editingItem={form.editingItem}
        saving={form.saving}
        onClose={form.closeForm}
        onSubmit={form.handleSubmit}
      />

      <ConfirmActionModal
        open={data.completingItem !== null}
        title="ثبت انجام یادآوری"
        message={data.completionMessage}
        onClose={data.closeCompleteConfirm}
        onConfirm={data.handleComplete}
        confirming={Boolean(data.completingId)}
        confirmLabel="تأیید"
      />

      <ConfirmDeleteModal
        open={data.deletingItem !== null}
        message="از حذف این یادآوری مطمئن هستید؟"
        onClose={data.closeDeleteConfirm}
        onConfirm={data.handleDelete}
        deleting={data.deleting}
      />
    </div>
  )
}
