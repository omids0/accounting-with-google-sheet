import { useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import {
  exportInstallmentsCsv,
  exportInstallmentsPdf,
  importInstallmentsCsv
} from '../../services/installments'
import { isConfigured } from '../../services/settings'
import type { RecordsDatePreset } from '../../utils/dateRange'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import StatCard from '../StatCard'
import InstallmentFormModal from './InstallmentFormModal'
import InstallmentsList from './InstallmentsList'
import type { InstallmentsPageProps } from './types'
import { useInstallmentMutations } from './useInstallmentMutations'
import { useInstallmentsData } from './useInstallmentsData'
import { useInstallmentsFilters } from './useInstallmentsFilters'
import { dashboardStatGridClass } from '../ui/chartStyles'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

export default function InstallmentsPage({ active = true }: InstallmentsPageProps) {
  const { plans, setPlans, loading, loadPlans } = useInstallmentsData()

  const mutations = useInstallmentMutations({
    setPlans,
    loadPlans
  })

  const filters = useInstallmentsFilters(plans)

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportInstallmentsCsv,
      exportPdfFn: exportInstallmentsPdf,
      importFn: importInstallmentsCsv,
      onComplete: loadPlans
    })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات اقساط',
      actions: createPageSpeedDialActions({
        onAdd: mutations.openCreateForm,
        onFilter: filters.openFilterModal,
        onRefresh: loadPlans,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      mutations.openCreateForm,
      filters.openFilterModal,
      loadPlans,
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
          <AppIcon name="installments" />
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
          searchPlaceholder="جستجو در اقساط..."
          datePreset={filters.draftDatePreset}
          customRange={filters.draftCustomRange}
          onDateFilterChange={filter => {
            if (filter.preset === 'all') return
            filters.setDraftDatePreset(filter.preset as RecordsDatePreset)
            filters.setDraftCustomRange(filter.customRange)
          }}
          dateLabel="بازه زمانی (سررسید)"
          dateLoading={loading}
        />
      </FilterModal>

      <InstallmentsList
        plans={plans}
        monthPlans={filters.monthPlans}
        filteredPlans={filters.filteredPlans}
        displayPlans={filters.displayPlans}
        monthLabel={filters.monthLabel}
        loading={loading}
        expandedId={mutations.expandedId}
        togglingKey={mutations.togglingKey}
        onToggleExpand={mutations.handleToggleExpand}
        onEdit={mutations.openEditForm}
        onDelete={mutations.openDeleteConfirm}
        onTogglePayment={mutations.handleTogglePayment}
        onPaymentAmountSave={mutations.handlePaymentAmountSave}
      />

      {plans.length > 0 && (
        <div className={dashboardStatGridClass}>
          <StatCard
            label={`مجموع اقساط ${filters.monthLabel}`}
            amount={filters.monthTotals.total}
            variant="default"
            tone="primary"
            sparklineData={filters.monthAmountSparkline}
            animateIndex={0}
            animated={false}
            lift
          />
          <StatCard
            label="پرداخت‌نشده این ماه"
            amount={filters.monthTotals.unpaid}
            variant="expense"
            sparklineData={filters.monthUnpaidSparkline}
            animateIndex={1}
            animated={false}
            lift
          />
        </div>
      )}

      <InstallmentFormModal
        open={mutations.showForm}
        editingPlan={mutations.editingPlan}
        saving={mutations.saving}
        onClose={mutations.closeForm}
        onSubmit={mutations.handleSubmit}
      />

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={mutations.deletingPlan !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={mutations.closeDeleteConfirm}
        onConfirm={mutations.handleDelete}
        deleting={mutations.deleting}
      />
    </div>
  )
}
