import { useMemo } from 'react'

import { isConfigured } from '../../services/settings'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import FilterModal from '../FilterModal'
import SpeedDialIcon from '../SpeedDialIcon'
import type { VehicleProfileWithRow } from './types'
import { useVehicleDetail } from './useVehicleDetail'
import { useVehicleDetailFilters } from './useVehicleDetailFilters'
import { useVehicleTransactionFilters } from './useVehicleTransactionFilters'
import {
  vehicleDetailMileageClass,
  vehicleDetailMileageValueClass,
  vehicleDetailToolbarClass
} from './vehicleCardStyles'
import VehicleCompleteModal from './VehicleCompleteModal'
import VehicleDeadlineFormModal from './VehicleDeadlineFormModal'
import VehicleDetailFilterFields from './VehicleDetailFilterFields'
import {
  buildCompleteInitialValues,
  buildDeadlineInitialValues,
  buildPeriodicInitialValues
} from './vehicleDetailFormInitialValues'
import VehicleDetailTabContent from './VehicleDetailTabContent'
import VehicleItemDeleteModal from './VehicleItemDeleteModal'
import VehicleMechanicFormModal from './VehicleMechanicFormModal'
import VehicleMileageModal from './VehicleMileageModal'
import VehiclePeriodicFormModal from './VehiclePeriodicFormModal'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
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
  const tabFilters = useVehicleDetailFilters({
    detailTab: page.detailTab,
    activeItems: page.activeItems,
    historyItems: page.history,
    serviceTypeSeed: page.serviceTypes
  })
  const transactionFilters = useVehicleTransactionFilters(page.transactions, page.detailTab)

  const detailTabOptions = useMemo(
    () => [
      { id: 'active', label: `موارد فعال (${page.activeItems.length.toLocaleString('fa-IR')})` },
      { id: 'history', label: `تاریخچه (${page.history.length.toLocaleString('fa-IR')})` },
      {
        id: 'transactions',
        label: `تراکنش‌ها (${page.transactions.length.toLocaleString('fa-IR')})`
      },
      { id: 'fuel', label: 'مصرف بنزین' }
    ],
    [page.activeItems.length, page.history.length, page.transactions.length]
  )

  const isTransactionsTab = page.detailTab === 'transactions'
  const filters = isTransactionsTab ? transactionFilters : tabFilters

  const speedDialConfig = useMemo(() => {
    if (!isConfigured()) return null

    return {
      ...page.pageSpeedDialConfig,
      actions: [
        {
          id: 'filter',
          label: 'فیلتر',
          icon: <SpeedDialIcon name="filter" />,
          onClick: filters.openFilterModal
        },
        ...page.pageSpeedDialConfig.actions
      ]
    }
  }, [filters.openFilterModal, page.pageSpeedDialConfig])

  useRegisterPageSpeedDial(speedDialConfig, active)

  const isActiveTab = page.detailTab === 'active'
  const isHistoryTab = page.detailTab === 'history'

  const periodicInitialValues = useMemo(
    () => buildPeriodicInitialValues(page.editingPeriodic, page.currentVehicle.mileage),
    [page.editingPeriodic, page.currentVehicle.mileage]
  )

  const deadlineInitialValues = useMemo(
    () => buildDeadlineInitialValues(page.editingDeadline),
    [page.editingDeadline]
  )

  const completeInitialValues = useMemo(
    () => buildCompleteInitialValues(page.completingPeriodic, page.currentVehicle),
    [page.completingPeriodic, page.currentVehicle]
  )

  const sourceItems = isActiveTab ? page.activeItems : isHistoryTab ? page.history : []
  const listItems = isActiveTab || isHistoryTab ? tabFilters.filteredItems : []
  const filteredTransactions = isTransactionsTab
    ? transactionFilters.filteredItems
    : page.transactions

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
          filterMode={isTransactionsTab ? 'transactions' : isActiveTab ? 'active' : 'history'}
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
          onChange={id => page.setDetailTab(id as 'active' | 'history' | 'transactions' | 'fuel')}
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
        fuelStats={page.fuelStats}
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

      <VehiclePeriodicFormModal
        open={page.showPeriodicForm}
        title={page.editingPeriodic ? 'ویرایش سرویس دوره‌ای' : 'سرویس دوره‌ای جدید'}
        defaultMileage={page.currentVehicle.mileage}
        serviceTypes={page.serviceTypes}
        onServiceTypesChange={page.setServiceTypes}
        initialValues={periodicInitialValues}
        saving={page.saving}
        onClose={page.closePeriodicForm}
        onSubmit={page.handlePeriodicSubmit}
      />

      <VehicleDeadlineFormModal
        open={page.showDeadlineForm}
        title={
          page.renewingDeadline ? 'تمدید موعد' : page.editingDeadline ? 'ویرایش موعد' : 'موعد جدید'
        }
        initialValues={deadlineInitialValues}
        saving={page.saving}
        onClose={page.closeDeadlineForm}
        onSubmit={page.handleDeadlineSubmit}
      />

      <VehicleCompleteModal
        open={page.showCompleteModal}
        serviceType={page.completingPeriodic?.serviceType ?? ''}
        defaultMileage={page.currentVehicle.mileage}
        initialValues={completeInitialValues}
        saving={page.saving}
        onClose={page.closeCompleteModal}
        onSubmit={page.handleCompleteSubmit}
      />

      <VehicleMechanicFormModal
        open={page.showMechanicForm}
        defaultMileage={page.currentVehicle.mileage}
        mechanicCategories={page.mechanicCategories}
        onMechanicCategoriesChange={page.setMechanicCategories}
        saving={page.saving}
        onClose={page.closeMechanicForm}
        onSubmit={page.handleMechanicSubmit}
      />

      <VehicleMileageModal
        open={page.showMileageModal}
        vehicleTitle={page.currentVehicle.title}
        currentMileage={page.currentVehicle.mileage}
        saving={page.saving}
        onClose={page.closeMileageModal}
        onSubmit={page.handleMileageSubmit}
      />

      <VehicleItemDeleteModal
        open={page.deletingTarget !== null}
        target={page.deletingTarget}
        deleteLinkedExpense={page.deleteLinkedExpense}
        onDeleteLinkedExpenseChange={page.setDeleteLinkedExpense}
        deleting={page.deleting}
        onClose={page.closeDeleteTarget}
        onConfirm={page.handleDelete}
      />

      <ConfirmDeleteModal
        open={page.deletingTransaction !== null}
        title="حذف تراکنش"
        message="این تراکنش از لیست هزینه‌ها هم حذف می‌شود. مطمئن هستید؟"
        deleting={page.deleting}
        onClose={() => {
          if (page.deleting) return
          page.setDeletingTransaction(null)
        }}
        onConfirm={() => void page.handleDeleteTransaction()}
      />
    </div>
  )
}
