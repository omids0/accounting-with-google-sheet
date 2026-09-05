import { useMemo, useState } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { isConfigured } from '../../services/settings'
import {
  exportWalletAccountsCsv,
  exportWalletAccountsPdf,
  importWalletAccountsCsv
} from '../../services/wallet'
import { useNavigationStore } from '../../stores/navigationStore'
import { distributionSparkline, flowTrendSparkline } from '../../utils/sparklineData'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import { WalletPageSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import type { WalletPageProps } from './types'
import { useWalletData } from './useWalletData'
import { useWalletFilters } from './useWalletFilters'
import { useWalletMutations } from './useWalletMutations'
import { computeReconciliation, computeTotalBalance } from './utils'
import WalletAccountCard from './WalletAccountCard'
import WalletFormModal from './WalletFormModal'
import WalletOpeningBalanceCard from './WalletOpeningBalanceCard'
import WalletReconciliationAlert from './WalletReconciliationAlert'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { receivableTotalCardClass } from '../ui/treasuryReceivableStyles'

export default function WalletPage({ active = true }: WalletPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [openingExpanded, setOpeningExpanded] = useState(false)

  const data = useWalletData()

  const filters = useWalletFilters(data.items)

  const mutations = useWalletMutations({
    items: data.items,
    setItems: data.setItems,
    balances: data.balances,
    setBalances: data.setBalances,
    syncBalances: data.syncBalances,
    periodFlow: data.periodFlow,
    setPeriodFlow: data.setPeriodFlow,
    openingInput: data.openingInput,
    setOpeningInput: data.setOpeningInput,
    loadItems: data.loadItems,
    expandedId,
    setExpandedId
  })

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportWalletAccountsCsv,
      exportPdfFn: exportWalletAccountsPdf,
      importFn: importWalletAccountsCsv,
      onComplete: data.loadItems
    })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات کیف پول',
      actions: createPageSpeedDialActions({
        onAdd: () => mutations.openCreateForm(),
        onFilter: filters.openFilterModal,
        onRefresh: data.loadItems,
        refreshDisabled: data.loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      mutations.openCreateForm,
      filters.openFilterModal,
      data.loadItems,
      data.loading,
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
          <AppIcon name="wallet" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  const totalBalance = computeTotalBalance(data.items, data.balances)

  const { periodBalance, reconciliationDiff, hasReconciliationGap } = computeReconciliation(
    totalBalance,
    data.periodFlow
  )

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
          searchPlaceholder="جستجو در حساب‌ها..."
        />
      </FilterModal>

      {data.periodFlow && (
        <WalletOpeningBalanceCard
          periodFlow={data.periodFlow}
          openingExpanded={openingExpanded}
          openingInput={data.openingInput}
          savingOpening={mutations.savingOpening}
          loading={data.loading}
          onToggleExpanded={() => setOpeningExpanded(v => !v)}
          onOpeningInputChange={data.setOpeningInput}
          onSave={mutations.handleSaveOpeningBalance}
          onOpenOpeningBalances={() =>
            useNavigationStore.getState().onTabChange('opening-balances')
          }
        />
      )}

      {data.loading && data.items.length === 0 ? (
        <WalletPageSkeleton />
      ) : data.items.length === 0 ? (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="wallet" />
          </div>
          <p>هنوز حسابی ثبت نشده</p>
        </div>
      ) : filters.filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filters.filteredItems.map(account => (
          <WalletAccountCard
            key={account.id}
            account={account}
            expanded={expandedId === account.id}
            balance={data.balances[account.id] ?? account.balance}
            saving={mutations.savingId === account.id}
            onToggleExpand={() => setExpandedId(expandedId === account.id ? null : account.id)}
            onEdit={() => mutations.openEditForm(account)}
            onDelete={() => mutations.openDeleteConfirm(account)}
            onBalanceChange={val => data.setBalances(prev => ({ ...prev, [account.id]: val }))}
            onBalanceSave={() => mutations.handleBalanceSave(account)}
            onClose={() => setExpandedId(null)}
          />
        ))
      )}

      {data.items.length > 0 && (
        <StatCard
          label="مجموع کل حساب‌ها"
          amount={totalBalance}
          variant="balance"
          wide
          sparklineData={
            data.periodFlow
              ? flowTrendSparkline(
                  data.periodFlow.openingBalance,
                  data.periodFlow.totalIncome,
                  data.periodFlow.totalExpense
                )
              : distributionSparkline(data.items.map(item => item.balance))
          }
          className={receivableTotalCardClass}
        />
      )}

      {hasReconciliationGap && (
        <WalletReconciliationAlert
          totalBalance={totalBalance}
          periodBalance={periodBalance}
          reconciliationDiff={reconciliationDiff}
        />
      )}

      <WalletFormModal
        open={mutations.showForm}
        editingAccount={mutations.editingAccount}
        saving={mutations.saving}
        onClose={mutations.closeForm}
        onSubmit={mutations.handleSubmit}
      />

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={mutations.deletingAccount !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={mutations.closeDeleteConfirm}
        onConfirm={mutations.handleDelete}
        deleting={mutations.deleting}
      />
    </div>
  )
}
