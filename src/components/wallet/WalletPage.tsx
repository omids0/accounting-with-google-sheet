import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import type { WalletPageProps } from './types'
import { useWalletData } from './useWalletData'
import { useWalletFilters } from './useWalletFilters'
import { useWalletMutations } from './useWalletMutations'
import { useWalletReconcile } from './useWalletReconcile'
import { computeReconciliation, computeTotalBalance, walletDeleteMessage } from './utils'
import WalletAccountCard from './WalletAccountCard'
import { walletCardsListClass } from './walletCardStyles'
import WalletFormModal from './WalletFormModal'
import WalletOpeningBalanceCard from './WalletOpeningBalanceCard'
import WalletReconciliationAlert from './WalletReconciliationAlert'
import WalletSmsReconcileStatus from './WalletSmsReconcileStatus'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { getPathForTab } from '../../routes/paths'
import { isConfigured } from '../../services/settings'
import {
  exportWalletAccountsCsv,
  exportWalletAccountsPdf,
  importWalletAccountsCsv
} from '../../services/wallet'
import {
  getWalletAccountKindCategories,
  getWalletBankCategories
} from '../../services/walletCategories'
import { useNavigationStore } from '../../stores/navigationStore'
import { distributionSparkline, flowTrendSparkline } from '../../utils/sparklineData'
import ActiveFilterChips from '../ActiveFilterChips'
import BankSmsPendingBanner from '../bankSms/BankSmsPendingBanner'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import EmptyState from '../EmptyState'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import { WalletPageSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import { listModulePageClass } from '../ui/featureCardStyles'
import { receivableTotalCardClass } from '../ui/treasuryReceivableStyles'

export default function WalletPage({ active = true }: WalletPageProps) {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [openingExpanded, setOpeningExpanded] = useState(false)

  const [bankCategories, setBankCategories] = useState<string[]>(() => getWalletBankCategories())
  const [accountKindCategories, setAccountKindCategories] = useState<string[]>(() =>
    getWalletAccountKindCategories()
  )

  const data = useWalletData()

  const filters = useWalletFilters(data.items)

  const reconcile = useWalletReconcile(data.items)

  const mutations = useWalletMutations({
    items: data.items,
    setItems: data.setItems,
    balances: data.balances,
    setBalances: data.setBalances,
    syncBalances: data.syncBalances,
    periodFlow: data.periodFlow,
    setPeriodFlow: data.setPeriodFlow,
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
    return <EmptyState icon="wallet" message="ابتدا با گوگل وارد شوید" />
  }

  const totalBalance = computeTotalBalance(data.items, data.balances)

  const { periodBalance, reconciliationDiff, hasReconciliationGap } = computeReconciliation(
    totalBalance,
    data.periodFlow
  )

  return (
    <div className={listModulePageClass}>
      <BankSmsPendingBanner />
      <ActiveFilterChips
        chips={filters.filterChips}
        onOpenFilters={filters.openFilterModal}
        onClearAll={filters.clearAllFilters}
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
          searchPlaceholder="جستجو در حساب‌ها..."
        />
      </FilterModal>

      {data.periodFlow && (
        <WalletOpeningBalanceCard
          periodFlow={data.periodFlow}
          openingExpanded={openingExpanded}
          onToggleExpanded={() => setOpeningExpanded(v => !v)}
          onOpenOpeningBalances={() =>
            useNavigationStore.getState().onTabChange('opening-balances')
          }
        />
      )}

      {data.loading && data.items.length === 0 ? (
        <WalletPageSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon="wallet"
          description="بانک‌ها، کارت‌ها و پول نقدت را این‌جا تعریف کن تا موجودی واقعی‌ات همیشه جلوی چشمت باشد."
          message="هنوز حسابی ثبت نشده"
          action={{ label: 'افزودن حساب', onClick: () => mutations.openCreateForm() }}
        />
      ) : filters.filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <div className={walletCardsListClass}>
          {filters.filteredItems.map(account => {
            const sms = reconcile.viewFor(account.id)

            return (
              <WalletAccountCard
                key={account.id}
                account={account}
                expanded={expandedId === account.id}
                balance={data.balances[account.id] ?? account.balance}
                saving={mutations.savingId === account.id}
                onToggleExpand={() => setExpandedId(expandedId === account.id ? null : account.id)}
                onOpen={() =>
                  navigate(
                    getPathForTab('wallet-account-detail', { walletAccountId: account.id }),
                    {
                      state: { title: account.title }
                    }
                  )
                }
                onEdit={() => mutations.openEditForm(account)}
                onDelete={() => mutations.openDeleteConfirm(account)}
                onBalanceChange={val => data.setBalances(prev => ({ ...prev, [account.id]: val }))}
                onBalanceSave={() => mutations.handleBalanceSave(account)}
                onClose={() => setExpandedId(null)}
                footer={
                  sms && (
                    <WalletSmsReconcileStatus
                      {...sms}
                      onFind={() =>
                        navigate(
                          getPathForTab('wallet-reconcile', { walletAccountId: account.id }),
                          {
                            state: { title: `تطبیق ${account.title}` }
                          }
                        )
                      }
                      onIgnore={() => reconcile.ignore(account.id)}
                    />
                  )
                }
              />
            )
          })}
        </div>
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
          reconciling={mutations.savingOpening}
          onReconcile={() => mutations.handleReconcileBalance(reconciliationDiff)}
        />
      )}

      <WalletFormModal
        open={mutations.showForm}
        editingAccount={mutations.editingAccount}
        saving={mutations.saving}
        bankCategories={bankCategories}
        onBankCategoriesChange={setBankCategories}
        accountKindCategories={accountKindCategories}
        onAccountKindCategoriesChange={setAccountKindCategories}
        onClose={mutations.closeForm}
        onSubmit={mutations.handleSubmit}
        smsDrafts={mutations.smsDrafts}
        onSmsDraftsChange={mutations.setSmsDrafts}
      />

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={mutations.deletingAccount !== null}
        title="حذف حساب"
        message={walletDeleteMessage(mutations.deletingAccount?.title)}
        onClose={mutations.closeDeleteConfirm}
        onConfirm={mutations.handleDelete}
        deleting={mutations.deleting}
      />
    </div>
  )
}
