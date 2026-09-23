import { useCallback, useMemo } from 'react'

import { isConfigured } from '../../services/settings'
import { buildMonthlyFuelStats, filterFuelTransactions } from '../../services/vehicleTransactions'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import FilterModal from '../FilterModal'
import type { VehicleProfileWithRow } from './types'
import { useVehicleDetail } from './useVehicleDetail'
import { useVehicleDetailFilters } from './useVehicleDetailFilters'
import { useVehicleDetailSpeedDial } from './useVehicleDetailSpeedDial'
import { useVehicleTransactionFilters } from './useVehicleTransactionFilters'
import {
  vehicleDetailMileageClass,
  vehicleDetailMileageValueClass,
  vehicleDetailToolbarClass
} from './vehicleCardStyles'
import VehicleDetailFilterFields from './VehicleDetailFilterFields'
import VehicleDetailModals from './VehicleDetailModals'
import type { HistoryWithRow } from './vehicleDetailMutations'
import VehicleDetailTabContent from './VehicleDetailTabContent'
import type { VehicleActiveListItem } from '../../types/vehicles'
import TransactionTypeSegment from '../TransactionTypeSegment'
import Card from '../ui/Card'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'

export default function VehicleDetailPage({
  vehicle,
  active = true
}: {
  vehicle: VehicleProfileWithRow
  active?: boolean
}) {
  const page = useVehicleDetail(vehicle)
  const deadlineItems = useMemo(
    () => page.activeItems.filter(item => item.kind === 'deadline'),
    [page.activeItems]
  )
  const mileageLogItems = useMemo(
    () => page.history.filter(item => item.recordKind === 'mileage'),
    [page.history]
  )
  const historyOnlyItems = useMemo(
    () => page.history.filter(item => item.recordKind !== 'mileage'),
    [page.history]
  )
  const tabFilters = useVehicleDetailFilters({
    detailTab: page.detailTab,
    activeItems: page.detailTab === 'deadlines' ? deadlineItems : page.activeItems,
    historyItems: page.detailTab === 'mileage' ? mileageLogItems : historyOnlyItems,
    serviceTypeSeed: page.serviceTypes
  })
  const transactionFilters = useVehicleTransactionFilters(page.transactions, page.detailTab)
  const filteredFuelStats = useMemo(
    () => buildMonthlyFuelStats(filterFuelTransactions(transactionFilters.filteredItems)),
    [transactionFilters.filteredItems]
  )

  const detailTabOptions = useMemo(
    () => [
      { id: 'active', label: `موارد فعال (${page.activeItems.length.toLocaleString('fa-IR')})` },
      { id: 'deadlines', label: `موعدها (${deadlineItems.length.toLocaleString('fa-IR')})` },
      { id: 'history', label: `تاریخچه (${historyOnlyItems.length.toLocaleString('fa-IR')})` },
      {
        id: 'mileage',
        label: `تاریخچه کارکرد (${mileageLogItems.length.toLocaleString('fa-IR')})`
      },
      {
        id: 'transactions',
        label: `تراکنش‌ها (${page.transactions.length.toLocaleString('fa-IR')})`
      },
      { id: 'fuel', label: 'مصرف بنزین' }
    ],
    [
      deadlineItems.length,
      historyOnlyItems.length,
      mileageLogItems.length,
      page.activeItems.length,
      page.transactions.length
    ]
  )

  const isTransactionsTab = page.detailTab === 'transactions'
  const isFuelTab = page.detailTab === 'fuel'
  const filters = isTransactionsTab || isFuelTab ? transactionFilters : tabFilters
  const isActiveTab = page.detailTab === 'active' || page.detailTab === 'deadlines'
  const isHistoryTab = page.detailTab === 'history' || page.detailTab === 'mileage'

  const sourceItems = isActiveTab
    ? page.detailTab === 'deadlines'
      ? deadlineItems
      : page.activeItems
    : isHistoryTab
    ? page.detailTab === 'mileage'
      ? mileageLogItems
      : historyOnlyItems
    : []
  const listItems = isActiveTab || isHistoryTab ? tabFilters.filteredItems : []
  const filteredTransactions = isTransactionsTab
    ? transactionFilters.filteredItems
    : page.transactions

  const getExportPayload = useCallback(
    () => ({
      vehicleTitle: page.currentVehicle.title,
      tab: page.detailTab,
      activeItems:
        page.detailTab === 'active' || page.detailTab === 'deadlines'
          ? (listItems as VehicleActiveListItem[])
          : [],
      historyItems: isHistoryTab ? (listItems as HistoryWithRow[]) : [],
      transactions: page.detailTab === 'transactions' ? filteredTransactions : [],
      fuelStats: isFuelTab ? filteredFuelStats : []
    }),
    [
      filteredFuelStats,
      filteredTransactions,
      isFuelTab,
      isHistoryTab,
      listItems,
      page.currentVehicle.title,
      page.detailTab
    ]
  )

  const exportConfirmModal = useVehicleDetailSpeedDial({
    active,
    pageSpeedDialConfig: page.pageSpeedDialConfig,
    openFilterModal: filters.openFilterModal,
    getExportPayload
  })

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="settings" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className={listModulePageClass}>
      <ActiveFilterChips
        chips={filters.filterChips}
        onOpenFilters={filters.openFilterModal}
        onClearAll={filters.clearAllFilters}
      />

      <FilterModal
        open={filters.filterModalOpen}
        onClose={() => filters.setFilterModalOpen(false)}
        onApply={filters.applyFilters}
        onClear={filters.clearDraftFilters}
      >
        <VehicleDetailFilterFields
          filterMode={
            isTransactionsTab
              ? 'transactions'
              : isFuelTab
              ? 'fuel'
              : page.detailTab === 'deadlines'
              ? 'deadlines'
              : isActiveTab
              ? 'active'
              : 'history'
          }
          loading={page.loading}
          draftSearch={filters.draftSearch}
          setDraftSearch={filters.setDraftSearch}
          draftCategory={filters.draftCategory}
          setDraftCategory={filters.setDraftCategory}
          categoryOptions={filters.categoryOptions}
          draftDatePreset={filters.draftDatePreset}
          draftCustomRange={filters.draftCustomRange}
          handleDraftDateFilterChange={filters.handleDraftDateFilterChange}
          draftServiceTypeFilter={tabFilters.draftServiceTypeFilter}
          setDraftServiceTypeFilter={tabFilters.setDraftServiceTypeFilter}
          serviceTypeOptions={tabFilters.serviceTypeOptions}
        />
      </FilterModal>

      <Card className={vehicleDetailToolbarClass}>
        <p className={vehicleDetailMileageClass}>
          کارکرد فعلی:{' '}
          <span className={vehicleDetailMileageValueClass}>
            {page.currentVehicle.mileage.toLocaleString('fa-IR')} km
          </span>
        </p>
        <TransactionTypeSegment
          options={detailTabOptions}
          value={page.detailTab}
          onChange={id =>
            page.setDetailTab(
              id as 'active' | 'deadlines' | 'history' | 'mileage' | 'transactions' | 'fuel'
            )
          }
          ariaLabel="بخش جزئیات خودرو"
          className="mb-0"
        />
      </Card>

      <VehicleDetailTabContent
        detailTab={page.detailTab}
        loading={page.loading}
        activeItems={page.activeItems}
        history={page.history}
        transactions={filteredTransactions}
        allTransactionsCount={page.transactions.length}
        fuelStats={filteredFuelStats}
        filterChipsCount={filters.filterChips.length}
        sourceItems={sourceItems}
        listItems={listItems}
        onComplete={page.openComplete}
        onRenew={page.openDeadlineRenew}
        onPeriodicEdit={page.openPeriodicEdit}
        onDeadlineEdit={page.openDeadlineEdit}
        onDeleteActive={activeItem => {
          if (activeItem.kind === 'periodic' && activeItem.periodic) {
            page.openDeleteTarget({ kind: 'periodic', item: activeItem.periodic })
          } else if (activeItem.deadline) {
            page.openDeleteTarget({ kind: 'deadline', item: activeItem.deadline })
          }
        }}
        onDeleteHistory={historyItem =>
          page.openDeleteTarget({ kind: 'history', item: historyItem })
        }
        onDeleteTransaction={transaction => page.setDeletingTransaction(transaction)}
      />

      <VehicleDetailModals
        vehicle={page.currentVehicle}
        serviceTypes={page.serviceTypes}
        onServiceTypesChange={page.setServiceTypes}
        deadlineCategories={page.deadlineCategories}
        onDeadlineCategoriesChange={page.setDeadlineCategories}
        mechanicCategories={page.mechanicCategories}
        onMechanicCategoriesChange={page.setMechanicCategories}
        showPeriodicForm={page.showPeriodicForm}
        editingPeriodic={page.editingPeriodic}
        showDeadlineForm={page.showDeadlineForm}
        editingDeadline={page.editingDeadline}
        renewingDeadline={page.renewingDeadline}
        showCompleteModal={page.showCompleteModal}
        completingPeriodic={page.completingPeriodic}
        showMechanicForm={page.showMechanicForm}
        showMileageModal={page.showMileageModal}
        saving={page.saving}
        deleting={page.deleting}
        deletingTarget={page.deletingTarget}
        deleteLinkedExpense={page.deleteLinkedExpense}
        onDeleteLinkedExpenseChange={page.setDeleteLinkedExpense}
        deletingTransaction={page.deletingTransaction}
        exportConfirmModal={exportConfirmModal}
        onClosePeriodicForm={page.closePeriodicForm}
        onPeriodicSubmit={page.handlePeriodicSubmit}
        onCloseDeadlineForm={page.closeDeadlineForm}
        onDeadlineSubmit={page.handleDeadlineSubmit}
        onCloseCompleteModal={page.closeCompleteModal}
        onCompleteSubmit={page.handleCompleteSubmit}
        onCloseMechanicForm={page.closeMechanicForm}
        onMechanicSubmit={page.handleMechanicSubmit}
        onCloseMileageModal={page.closeMileageModal}
        onMileageSubmit={page.handleMileageSubmit}
        onCloseDeleteTarget={page.closeDeleteTarget}
        onDelete={page.handleDelete}
        onCloseDeletingTransaction={() => {
          if (page.deleting) return
          page.setDeletingTransaction(null)
        }}
        onDeleteTransaction={page.handleDeleteTransaction}
      />
    </div>
  )
}
