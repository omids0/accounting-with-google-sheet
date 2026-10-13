import { useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useHighlightParam } from '../../hooks/useHighlightParam'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import DangFormModal from './DangFormModal'
import DangList from './DangList'
import { useDangFilters } from './useDangFilters'
import { useDangForm } from './useDangForm'
import { useDangItems } from './useDangItems'
import SettleFlowModals from '../settle/SettleFlowModals'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'

export default function DangPage({ active = true }: { active?: boolean }) {
  const {
    items,
    loading,
    categories,
    setCategories,
    counterparties,
    setCounterparties,
    expandedId,
    setExpandedId,
    togglingId,
    savingAmountId,
    amountEdits,
    loadItems,
    handleTogglePaid,
    handleAmountChange,
    handleAmountBlur,
    requestDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal,
    settleFlow
  } = useDangItems()

  useHighlightParam(setExpandedId)

  const { showForm, editingItem, saving, openCreateForm, openEditForm, closeForm, handleSubmit } =
    useDangForm({
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
    draftCounterparty,
    setDraftCounterparty,
    draftDatePreset,
    draftCustomRange,
    categoryOptions,
    counterpartyOptions,
    filteredItems,
    openFilterModal,
    filterChips,
    clearAllFilters,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters,
    minePanelProps
  } = useDangFilters({ items, categories, counterparties })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات بدهی',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        addLabel: 'ثبت بدهی',
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
          <AppIcon name="debt" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className={listModulePageClass}>
      <ActiveFilterChips
        chips={filterChips}
        onOpenFilters={openFilterModal}
        onClearAll={clearAllFilters}
        inHeader
      />

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
          counterparty={draftCounterparty}
          onCounterpartyChange={setDraftCounterparty}
          counterpartyOptions={counterpartyOptions}
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={handleDraftDateFilterChange}
          dateIncludeAll
          dateLoading={loading}
          {...minePanelProps}
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
        onDelete={requestDelete}
        onAdd={openCreateForm}
      />

      <DangFormModal
        open={showForm}
        editingItem={editingItem}
        saving={saving}
        categories={categories}
        counterparties={counterparties}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onCategoriesChange={setCategories}
        onCounterpartiesChange={setCounterparties}
      />

      <ConfirmActionModal {...importExportConfirmModal} />
      <SettleFlowModals flow={settleFlow} />
    </div>
  )
}
