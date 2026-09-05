import { useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import CheckFormModal from './CheckFormModal'
import CheckList from './CheckList'
import type { ChecksPageProps } from './types'
import { useChecksData } from './useChecksData'
import { useChecksFilters } from './useChecksFilters'
import { useChecksForm } from './useChecksForm'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

export default function ChecksPage({ active = true }: ChecksPageProps) {
  const {
    items,
    loading,
    togglingId,
    deletingItem,
    deleting,
    loadItems,
    handleTogglePaid,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  } = useChecksData()

  const { showForm, editingItem, saving, openCreateForm, openEditForm, closeForm, handleSubmit } =
    useChecksForm({ onSaved: loadItems })

  const {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftPaymentStatus,
    setDraftPaymentStatus,
    draftDatePreset,
    draftCustomRange,
    filteredItems,
    openFilterModal,
    filterChips,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  } = useChecksFilters({ items })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات چک‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onFilter: openFilterModal,
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      openFilterModal,
      loadItems,
      loading,
      handleImport,
      handleExport,
      handleExportPdf,
      openCreateForm
    ]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="checks" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
      <ActiveFilterChips chips={filterChips} onChipClick={openFilterModal} />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={applyFilters}
        onClear={clearDraftFilters}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در چک‌ها..."
          paymentStatus={draftPaymentStatus}
          onPaymentStatusChange={setDraftPaymentStatus}
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={handleDraftDateFilterChange}
          dateIncludeAll
          dateLabel="بازه زمانی (سررسید)"
          dateLoading={loading}
        />
      </FilterModal>

      <CheckList
        items={items}
        filteredItems={filteredItems}
        loading={loading}
        togglingId={togglingId}
        onTogglePaid={handleTogglePaid}
        onEdit={openEditForm}
        onDelete={openDeleteConfirm}
      />

      <CheckFormModal
        open={showForm}
        editingItem={editingItem}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={deletingItem !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  )
}
