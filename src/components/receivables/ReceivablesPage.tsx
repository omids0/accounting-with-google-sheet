import { useMemo, useState } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useHighlightParam } from '../../hooks/useHighlightParam'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import {
  exportReceivablesCsv,
  exportReceivablesPdf,
  importReceivablesCsv,
  remainingAmount
} from '../../services/receivables'
import { isConfigured } from '../../services/settings'
import type { SettleOptions } from '../../services/settleOptions'
import { distributionSparkline } from '../../utils/sparklineData'
import ActiveFilterChips from '../ActiveFilterChips'
import ConfirmActionModal from '../ConfirmActionModal'
import EmptyState from '../EmptyState'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import ReceivableTable from './ReceivableTable'
import SettleFlowModals from '../settle/SettleFlowModals'
import { InstallmentCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import ReceivableCard from './ReceivableCard'
import ReceivableFormModal from './ReceivableFormModal'
import type { ReceivableWithRow, ReceivablesPageProps } from './types'
import { useReceivableMutations } from './useReceivableMutations'
import { useReceivablesData } from './useReceivablesData'
import { useReceivablesFilters } from './useReceivablesFilters'
import { listCardsContainerClass, listModulePageClass } from '../ui/featureCardStyles'
import { receivableTotalCardClass } from '../ui/treasuryReceivableStyles'

export default function ReceivablesPage({ active = true }: ReceivablesPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const isDesktop = useIsDesktop()

  useHighlightParam(setExpandedId)

  const {
    items: allItems,
    setItems,
    loading,
    categories,
    setCategories,
    counterparties,
    setCounterparties,
    loadItems
  } = useReceivablesData()

  const mutations = useReceivableMutations({
    items: allItems,
    setItems,
    loadItems,
    setExpandedId
  })
  const items = mutations.visibleItems

  const filters = useReceivablesFilters(items, categories, counterparties)

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
        addLabel: 'ثبت طلب',
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
    return <EmptyState icon="receivables" message="ابتدا با گوگل وارد شوید" />
  }

  const linkedIds = allItems.flatMap(item =>
    item.payments.flatMap(payment =>
      payment.transactionRecordId ? [payment.transactionRecordId] : []
    )
  )

  const cardProps = (item: ReceivableWithRow) => ({
    item,
    expanded: expandedId === item.id,
    payingId: mutations.payingId,
    settlingId: mutations.settlingId,
    togglingPaymentId: mutations.togglingPaymentId,
    paymentReceivableId: mutations.paymentReceivableId,
    settlementReceivableId: mutations.settlementReceivableId,
    onToggleExpand: (expanded: boolean) => mutations.toggleExpanded(item.id, expanded),
    onEdit: () => mutations.openEditForm(item),
    onDelete: () => mutations.requestDelete(item),
    onOpenPaymentForm: mutations.setPaymentReceivableId,
    onClosePaymentForm: () => mutations.setPaymentReceivableId(null),
    onOpenSettlementForm: mutations.setSettlementReceivableId,
    onCloseSettlementForm: () => mutations.setSettlementReceivableId(null),
    linkedIds,
    onAddPayment: (values: { amount: number | ''; note: string }, options: SettleOptions) =>
      mutations.handleAddPayment(item, values, options),
    onSettle: (values: { title: string; note: string }, options: SettleOptions) =>
      mutations.handleSettle(item, values, options),
    onRemovePayment: (paymentId: string) => mutations.handleRemovePayment(item, paymentId)
  })

  return (
    <div className={listModulePageClass}>
      <ActiveFilterChips
        chips={filters.filterChips}
        onOpenFilters={filters.openFilterModal}
        onClearAll={filters.clearAllFilters}
        inHeader
      />

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
          counterparty={filters.draftCounterparty}
          onCounterpartyChange={filters.setDraftCounterparty}
          counterpartyOptions={filters.counterpartyOptions}
          datePreset={filters.draftDatePreset}
          customRange={filters.draftCustomRange}
          onDateFilterChange={filter => {
            filters.setDraftDatePreset(filter.preset)
            filters.setDraftCustomRange(filter.customRange)
          }}
          dateIncludeAll
          dateLabel="بازه زمانی (تاریخ قرض)"
          dateLoading={loading}
          {...filters.minePanelProps}
        />
      </FilterModal>

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton
          footerStats={1}
          footerClassName={receivableTotalCardClass}
          table
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="receivables"
          description="پولی که به دیگران قرض داده‌ای یا از کسی طلب داری را این‌جا ثبت کن تا فراموش نشود."
          message="هنوز طلبی ثبت نشده"
          action={{ label: 'افزودن طلب', onClick: () => mutations.openCreateForm() }}
        />
      ) : filters.filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : isDesktop ? (
        <ReceivableTable
          items={filters.filteredItems}
          expandedId={expandedId}
          onToggleExpand={(item, expanded) => mutations.toggleExpanded(item.id, expanded)}
          onEdit={mutations.openEditForm}
          onDelete={mutations.requestDelete}
          renderDetail={item => <ReceivableCard index={0} {...cardProps(item)} bodyOnly />}
        />
      ) : (
        <div className={listCardsContainerClass}>
          {filters.filteredItems.map((item, index) => (
            <ReceivableCard key={item.id} index={index} {...cardProps(item)} />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <StatCard
          label={filters.showFilteredTotal ? 'مجموع مانده (فیلتر شده)' : 'مجموع مانده طلب‌ها'}
          amount={
            filters.showFilteredTotal ? filters.filteredTotalRemaining : filters.totalRemaining
          }
          variant="balance"
          wide
          sparklineData={distributionSparkline(
            (filters.showFilteredTotal ? filters.filteredItems : items).map(item =>
              remainingAmount(item)
            )
          )}
          className={receivableTotalCardClass}
        />
      )}

      <ReceivableFormModal
        open={mutations.showForm}
        editingItem={mutations.editingItem}
        categories={categories}
        setCategories={setCategories}
        counterparties={counterparties}
        saving={mutations.saving}
        onClose={mutations.closeForm}
        onSubmit={mutations.handleSubmit}
        onCounterpartiesChange={setCounterparties}
      />

      <ConfirmActionModal {...importExportConfirmModal} />
      <SettleFlowModals flow={mutations.settleFlow} />
    </div>
  )
}
