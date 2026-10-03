import { useMemo } from 'react'

import DangSplitGroupCard from './DangSplitGroupCard'
import DangSplitGroupFormModal from './DangSplitGroupFormModal'
import type { DangSplitGroupListItem } from './types'
import { useDangSplitGroupForm } from './useDangSplitGroupForm'
import { useDangSplitGroups } from './useDangSplitGroups'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import AppIcon from '../AppIcon'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import { DangCardListSkeleton } from '../skeleton'
import Button from '../ui/Button'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listCardsContainerClass, listModulePageClass } from '../ui/featureCardStyles'

export default function DangSplitPage({ active = true }: { active?: boolean }) {
  const {
    items,
    loading,
    deletingItem,
    deleting,
    loadItems,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete
  } = useDangSplitGroups()

  const { showForm, editingItem, saving, openCreateForm, openEditForm, closeForm, handleSubmit } =
    useDangSplitGroupForm({ onSaved: loadItems })

  const openGroup = (item: DangSplitGroupListItem) => {
    useNavigationStore.getState().onTabChange('dang-split-detail', {
      dangSplitGroupId: item.id,
      dangSplitGroupTitle: item.title
    })
  }

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات محاسبه دنگ',
      actions: createPageSpeedDialActions({
        onAdd: openCreateForm,
        onRefresh: loadItems,
        refreshDisabled: loading
      })
    }),
    [loadItems, loading, openCreateForm]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="calculator" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (loading && items.length === 0) {
    return <DangCardListSkeleton filterChips={0} />
  }

  return (
    <div className={listModulePageClass}>
      {items.length === 0 ? (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="calculator" />
          </div>
          <p>هنوز گروه دنگی ساخته نشده</p>
          <Button type="button" variant="primary" size="sm" onClick={openCreateForm}>
            افزودن گروه دنگ
          </Button>
        </div>
      ) : (
        <div className={listCardsContainerClass}>
          {items.map(item => (
            <DangSplitGroupCard
              key={item.id}
              item={item}
              onOpen={openGroup}
              onEdit={openEditForm}
              onDelete={openDeleteConfirm}
            />
          ))}
        </div>
      )}

      <DangSplitGroupFormModal
        open={showForm}
        editingItem={editingItem}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteModal
        open={deletingItem !== null}
        title="حذف گروه دنگ"
        message={`با حذف «${
          deletingItem?.title ?? ''
        }» همه افراد، اقلام و تخصیص‌های آن هم حذف می‌شوند. مطمئن هستید؟`}
        deleting={deleting}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
      />
    </div>
  )
}
