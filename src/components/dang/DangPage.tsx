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
import DangFormModal from './DangFormModal'
import DangList from './DangList'
import { useDangFilters } from './useDangFilters'
import { useDangForm } from './useDangForm'
import { useDangItems } from './useDangItems'

export default function DangPage({
  onReauth,
  active = true
}: {
  onReauth?: () => void
  active?: boolean
}) {
  const {
    items,
    loading,
    categories,
    setCategories,
    expandedId,
    setExpandedId,
    deletingItem,
    deleting,
    togglingId,
    savingAmountId,
    amountEdits,
    loadItems,
    handleTogglePaid,
    handleAmountChange,
    handleAmountBlur,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  } = useDangItems(onReauth)

  const {
    showForm,
    editingItem,
    saving,
    form,
    setForm,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit
  } = useDangForm({
    categories,
    onReauth,
    onSaved: loadItems
  })

  const {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftPaymentStatus,
    setDraftPaymentStatus,
    draftCategory,
    setDraftCategory,
    draftDatePreset,
    draftCustomRange,
    categoryOptions,
    filteredItems,
    openFilterModal,
    filterChips,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  } = useDangFilters({ items, categories })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات بدهی',
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
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="debt" />
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
          searchPlaceholder="جستجو در بدهی‌ها..."
          paymentStatus={draftPaymentStatus}
          onPaymentStatusChange={setDraftPaymentStatus}
          category={draftCategory}
          onCategoryChange={setDraftCategory}
          categoryOptions={categoryOptions}
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={handleDraftDateFilterChange}
          dateIncludeAll
          dateLoading={loading}
        />
      </FilterModal>

      <DangList
        items={items}
        filteredItems={filteredItems}
        loading={loading}
        expandedId={expandedId}
        togglingId={togglingId}
        savingAmountId={savingAmountId}
        amountEdits={amountEdits}
        onExpand={setExpandedId}
        onTogglePaid={handleTogglePaid}
        onAmountChange={handleAmountChange}
        onAmountBlur={handleAmountBlur}
        onEdit={openEditForm}
        onDelete={openDeleteConfirm}
      />

      <DangFormModal
        open={showForm}
        editingItem={editingItem}
        form={form}
        saving={saving}
        categories={categories}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onFormChange={setForm}
        onCategoriesChange={setCategories}
        onReauth={onReauth}
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
