import { useMemo, useState } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import {
  exportReceivablesCsv,
  exportReceivablesPdf,
  importReceivablesCsv,
  remainingAmount
} from '../../services/receivables'
import { isConfigured } from '../../services/settings'
import { distributionSparkline } from '../../utils/sparklineData'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import { InstallmentCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import ReceivableCard from './ReceivableCard'
import ReceivableFormModal from './ReceivableFormModal'
import type { ReceivablesPageProps } from './types'
import { useReceivableMutations } from './useReceivableMutations'
import { useReceivablesData } from './useReceivablesData'
import { useReceivablesFilters } from './useReceivablesFilters'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { receivableTotalCardClass } from '../ui/treasuryReceivableStyles'

export default function ReceivablesPage({ active = true }: ReceivablesPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { items, setItems, loading, categories, setCategories, loadItems } = useReceivablesData()

  const mutations = useReceivableMutations({
    setItems,
    loadItems,
    expandedId,
    setExpandedId
  })

  const filters = useReceivablesFilters(items, categories)

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportReceivablesCsv,
      exportPdfFn: exportReceivablesPdf,
      importFn: importReceivablesCsv,
      onComplete: loadItems
    })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات طلب‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => mutations.openCreateForm(),
        onFilter: filters.openFilterModal,
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      mutations.openCreateForm,
      filters.openFilterModal,
      loadItems,
      loading,
      handleImport,
      handleExport,
      handleExportPdf
    ]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="receivables" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
      <ActiveFilterChips chips={filters.filterChips} onChipClick={filters.openFilterModal} />

      <FilterModal
        open={filters.filterModalOpen}
        onClose={() => filters.setFilterModalOpen(false)}
        onApply={filters.applyDraftFilters}
        onClear={filters.clearDraftFilters}
      >
        <PageFilterPanel
          search={filters.draftSearch}
          onSearchChange={filters.setDraftSearch}
          searchPlaceholder="جستجو در طلب‌ها..."
          paymentStatus={filters.draftPaymentStatus}
          onPaymentStatusChange={filters.setDraftPaymentStatus}
          paymentStatusPaidLabel="تسویه شده"
          category={filters.draftCategory}
          onCategoryChange={filters.setDraftCategory}
          categoryOptions={filters.categoryOptions}
          datePreset={filters.draftDatePreset}
          customRange={filters.draftCustomRange}
          onDateFilterChange={filter => {
            filters.setDraftDatePreset(filter.preset)
            filters.setDraftCustomRange(filter.customRange)
          }}
          dateIncludeAll
          dateLabel="بازه زمانی (تاریخ قرض)"
          dateLoading={loading}
        />
      </FilterModal>

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton footerStats={1} />
      ) : items.length === 0 ? (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="receivables" />
          </div>
          <p>هنوز طلبی ثبت نشده</p>
        </div>
      ) : filters.filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filters.filteredItems.map((item, index) => (
          <ReceivableCard
            key={item.id}
            item={item}
            index={index}
            expanded={expandedId === item.id}
            payingId={mutations.payingId}
            settlingId={mutations.settlingId}
            togglingPaymentId={mutations.togglingPaymentId}
            paymentReceivableId={mutations.paymentReceivableId}
            settlementReceivableId={mutations.settlementReceivableId}
            onToggleExpand={expanded => mutations.toggleExpanded(item.id, expanded)}
            onEdit={() => mutations.openEditForm(item)}
            onDelete={() => mutations.openDeleteConfirm(item)}
            onOpenPaymentForm={mutations.setPaymentReceivableId}
            onClosePaymentForm={() => mutations.setPaymentReceivableId(null)}
            onOpenSettlementForm={mutations.setSettlementReceivableId}
            onCloseSettlementForm={() => mutations.setSettlementReceivableId(null)}
            onAddPayment={values => mutations.handleAddPayment(item, values)}
            onSettle={values => mutations.handleSettle(item, values)}
            onRemovePayment={paymentId => mutations.handleRemovePayment(item, paymentId)}
          />
        ))
      )}

      {items.length > 0 && (
        <StatCard
          label={filters.showFilteredTotal ? 'مجموع مانده (فیلتر شده)' : 'مجموع مانده طلب‌ها'}
          amount={
            filters.showFilteredTotal ? filters.filteredTotalRemaining : filters.totalRemaining
          }
          variant="balance"
          wide
          sparklineData={distributionSparkline(items.map(item => remainingAmount(item)))}
          className={receivableTotalCardClass}
        />
      )}

      <ReceivableFormModal
        open={mutations.showForm}
        editingItem={mutations.editingItem}
        categories={categories}
        setCategories={setCategories}
        saving={mutations.saving}
        onClose={mutations.closeForm}
        onSubmit={mutations.handleSubmit}
      />

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={mutations.deletingItem !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={mutations.closeDeleteConfirm}
        onConfirm={mutations.handleDelete}
        deleting={mutations.deleting}
      />
    </div>
  )
}
