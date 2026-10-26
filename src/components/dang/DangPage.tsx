import { useMemo, type ReactNode } from 'react'

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
import DangList, { type DangEmptyCopy } from './DangList'
import type { DangWithRow } from './types'
import { useDangFilters } from './useDangFilters'
import { useDangForm } from './useDangForm'
import { useDangItems } from './useDangItems'
import SettleFlowModals from '../settle/SettleFlowModals'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'
import { useReadOnly } from '../ui/readOnly'

/** Narrows the list and adds a header above it («بدهی ساختمان» chips, counted over all debts). */
export interface DangPageScope {
  header: (items: DangWithRow[]) => ReactNode
  filter: (items: DangWithRow[]) => DangWithRow[]
  /** Replaces the personal wording of the empty list. */
  emptyCopy?: DangEmptyCopy
}

export default function DangPage({
  active = true,
  scope
}: {
  active?: boolean
  scope?: DangPageScope
}) {
  const readOnly = useReadOnly()
  const {
    items,
    loading,
    building,
    categories,
    setCategories,
    counterparties,
    setCounterparties,
    expandedId,
    setExpandedId,
    toggleExpanded,
    togglingId,
    savingAmountId,
    amountEdits,
    payments,
    loadItems,
    handleTogglePaid,
    handleAmountChange,
    handleAmountBlur,
    requestDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal,
    linkedRecordsModal,
    settleFlow
  } = useDangItems()

  const highlightId = useHighlightParam(setExpandedId)

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
    hasActiveFilters,
    openFilterModal,
    filterChips,
    clearAllFilters,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters,
    minePanelProps
  } = useDangFilters({ items, categories, counterparties, building })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات بدهی',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        addLabel: 'ثبت بدهی',
        readOnly,
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
      openCreateForm,
      readOnly
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
          paymentStatusPaidLabel={building ? undefined : 'تسویه شده'}
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

      {scope?.header(items)}

      <DangList
        items={items}
        filteredItems={scope ? scope.filter(filteredItems) : filteredItems}
        loading={loading}
        expandedId={expandedId}
        togglingId={togglingId}
        payments={payments}
        amountEdit={{
          savingAmountId,
          amountEdits,
          onAmountChange: handleAmountChange,
          onAmountBlur: handleAmountBlur
        }}
        onExpand={toggleExpanded}
        onTogglePaid={handleTogglePaid}
        onEdit={openEditForm}
        onDelete={requestDelete}
        onAdd={openCreateForm}
        building={building}
        filtered={hasActiveFilters}
        resetKey={filterChips.map(chip => chip.label).join('|')}
        highlightId={highlightId}
        emptyCopy={scope?.emptyCopy}
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
      <ConfirmActionModal {...linkedRecordsModal} />
      <SettleFlowModals flow={settleFlow} />
    </div>
  )
}
