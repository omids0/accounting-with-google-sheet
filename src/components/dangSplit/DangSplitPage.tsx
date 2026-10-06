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
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import EmptyState from '../EmptyState'
import { DangCardListSkeleton } from '../skeleton'
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
    return <EmptyState icon="calculator" message="ابتدا با گوگل وارد شوید" />
  }

  if (loading && items.length === 0) {
    return <DangCardListSkeleton filterChips={0} />
  }

  return (
    <div className={listModulePageClass}>
      {items.length === 0 ? (
        <EmptyState
          icon="calculator"
          message="هنوز گروه دنگی ساخته نشده"
          action={{ label: 'افزودن گروه دنگ', onClick: openCreateForm }}
        />
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
