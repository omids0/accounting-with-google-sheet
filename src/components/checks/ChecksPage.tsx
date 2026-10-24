import { useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useHighlightParam } from '../../hooks/useHighlightParam'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import FilterModal from '../FilterModal'
import { SegmentedRadio } from '../form'
import PageFilterPanel from '../PageFilterPanel'
import CheckFormModal from './CheckFormModal'
import CheckList from './CheckList'
import type { ChecksPageProps } from './types'
import { useChecksData } from './useChecksData'
import { useChecksFilters } from './useChecksFilters'
import { useChecksForm } from './useChecksForm'
import SettleFlowModals from '../settle/SettleFlowModals'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'
import { useReadOnly } from '../ui/readOnly'

export default function ChecksPage({ active = true }: ChecksPageProps) {
  const readOnly = useReadOnly()
  const {
    items,
    counterparties,
    setCounterparties,
    loading,
    togglingId,
    loadItems,
    handleTogglePaid,
    requestDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal,
    attachmentQuestionModal,
    settleFlow
  } = useChecksData()

  useHighlightParam()

  const {
    showForm,
    editingItem,
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    attachments
  } = useChecksForm({ onSaved: loadItems })

  const {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftPaymentStatus,
    setDraftPaymentStatus,
    draftCounterparty,
    setDraftCounterparty,
    draftDatePreset,
    draftCustomRange,
    counterpartyOptions,
    filteredItems,
    direction,
    openFilterModal,
    filterChips,
    clearAllFilters,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters,
    minePanelProps
  } = useChecksFilters({ items, counterparties })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات چک‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        addLabel: 'ثبت چک',
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
          <AppIcon name="checks" />
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
          searchPlaceholder="جستجو در چک‌ها..."
          paymentStatus={draftPaymentStatus}
          onPaymentStatusChange={setDraftPaymentStatus}
          counterparty={draftCounterparty}
          onCounterpartyChange={setDraftCounterparty}
          counterpartyOptions={counterpartyOptions}
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={handleDraftDateFilterChange}
          dateIncludeAll
          dateLabel="بازه زمانی (سررسید)"
          dateLoading={loading}
          {...direction.panelProps}
          {...minePanelProps}
        />
      </FilterModal>

      {items.length > 0 ? (
        <SegmentedRadio
          label="نوع چک"
          options={direction.options}
          value={direction.kind}
          onChange={direction.set}
          className="[&_button]:min-h-11"
        />
      ) : null}

      <CheckList
        items={items}
        filteredItems={filteredItems}
        loading={loading}
        togglingId={togglingId}
        onTogglePaid={handleTogglePaid}
        onEdit={openEditForm}
        onDelete={requestDelete}
        onAdd={openCreateForm}
        directionNote={direction.activeLabel}
        onClearDirection={() => direction.set('all')}
      />

      <CheckFormModal
        open={showForm}
        editingItem={editingItem}
        saving={saving}
        counterparties={counterparties}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onCounterpartiesChange={setCounterparties}
        attachments={attachments}
      />

      <ConfirmActionModal {...importExportConfirmModal} />
      <ConfirmActionModal {...attachmentQuestionModal} />
      <SettleFlowModals flow={settleFlow} />
    </div>
  )
}
