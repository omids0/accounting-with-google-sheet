import { useMemo } from 'react'

import { isConfigured } from '../../services/settings'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import type { VehicleProfileWithRow } from './types'
import { useVehicleDetail } from './useVehicleDetail'
import { useVehicleDetailFilters, type VehicleDetailFilterItem } from './useVehicleDetailFilters'
import VehicleActiveItemCard from './VehicleActiveItemCard'
import {
  vehicleDetailMileageClass,
  vehicleDetailMileageValueClass,
  vehicleDetailToolbarClass,
  vehicleHorizontalCardsContainerClass
} from './vehicleCardStyles'
import VehicleCompleteModal from './VehicleCompleteModal'
import VehicleDeadlineFormModal from './VehicleDeadlineFormModal'
import type { HistoryWithRow } from './vehicleDetailMutations'
import VehicleHistoryCard from './VehicleHistoryCard'
import VehicleItemDeleteModal from './VehicleItemDeleteModal'
import VehicleMechanicFormModal from './VehicleMechanicFormModal'
import VehicleMileageModal from './VehicleMileageModal'
import VehiclePeriodicFormModal from './VehiclePeriodicFormModal'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
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
  const filters = useVehicleDetailFilters({
    detailTab: page.detailTab,
    activeItems: page.activeItems,
    historyItems: page.history
  })

  const detailTabOptions = useMemo(
    () => [
      { id: 'active', label: `موارد فعال (${page.activeItems.length.toLocaleString('fa-IR')})` },
      { id: 'history', label: `تاریخچه (${page.history.length.toLocaleString('fa-IR')})` }
    ],
    [page.activeItems.length, page.history.length]
  )

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

  const sourceItems = page.detailTab === 'active' ? page.activeItems : page.history
  const listItems = filters.filteredItems
  const isActiveTab = page.detailTab === 'active'

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
        <PageFilterPanel
          search={filters.draftSearch}
          onSearchChange={filters.setDraftSearch}
          searchPlaceholder={isActiveTab ? 'جستجو در موارد فعال...' : 'جستجو در تاریخچه...'}
          category={filters.draftCategory}
          onCategoryChange={filters.setDraftCategory}
          categoryOptions={filters.categoryOptions}
          categoryLabel={isActiveTab ? 'فوریت' : 'نوع'}
          {...(isActiveTab
            ? {}
            : {
                datePreset: filters.draftDatePreset,
                customRange: filters.draftCustomRange,
                onDateFilterChange: filters.handleDraftDateFilterChange,
                dateIncludeAll: true as const,
                dateLabel: 'بازه زمانی (تاریخ)',
                dateLoading: page.loading
              })}
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
          onChange={id => page.setDetailTab(id as 'active' | 'history')}
          ariaLabel="بخش جزئیات خودرو"
          className="mb-0"
        />
      </Card>

      {page.loading && page.activeItems.length === 0 && page.history.length === 0 ? (
        <DangCardListSkeleton filterChips={filters.filterChips.length} />
      ) : sourceItems.length === 0 ? (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="settings" />
          </div>
          <p>{isActiveTab ? 'مورد فعالی ثبت نشده' : 'تاریخچه‌ای ثبت نشده'}</p>
        </div>
      ) : listItems.length === 0 ? (
        <SearchEmptyState />
      ) : isActiveTab ? (
        <div className={vehicleHorizontalCardsContainerClass}>
          {(listItems as VehicleActiveListItem[]).map(item => (
            <VehicleActiveItemCard
              key={item.id}
              item={item}
              onComplete={page.openComplete}
              onRenew={page.openDeadlineRenew}
              onEdit={item.kind === 'periodic' ? page.openPeriodicEdit : page.openDeadlineEdit}
              onDelete={activeItem => {
                if (activeItem.kind === 'periodic' && activeItem.periodic) {
                  page.openDeleteTarget({ kind: 'periodic', item: activeItem.periodic })
                } else if (activeItem.deadline) {
                  page.openDeleteTarget({ kind: 'deadline', item: activeItem.deadline })
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className={vehicleHorizontalCardsContainerClass}>
          {(listItems as VehicleDetailFilterItem[] as HistoryWithRow[]).map(item => (
            <VehicleHistoryCard
              key={item.id}
              item={item}
              onDelete={historyItem =>
                page.openDeleteTarget({ kind: 'history', item: historyItem })
              }
            />
          ))}
        </div>
      )}

      <VehiclePeriodicFormModal
        open={page.showPeriodicForm}
        title={page.editingPeriodic ? 'ویرایش سرویس دوره‌ای' : 'سرویس دوره‌ای جدید'}
        defaultMileage={page.currentVehicle.mileage}
        serviceTypes={page.serviceTypes}
        onServiceTypesChange={page.setServiceTypes}
        initialValues={
          page.editingPeriodic
            ? {
                serviceType: page.editingPeriodic.serviceType,
                mileage: String(page.editingPeriodic.currentMileage),
                intervalKm: String(page.editingPeriodic.intervalKm),
                brand: page.editingPeriodic.brand,
                location: page.editingPeriodic.location,
                amount: page.editingPeriodic.amount || '',
                notes: page.editingPeriodic.notes
              }
            : undefined
        }
        saving={page.saving}
        onClose={page.closePeriodicForm}
        onSubmit={page.handlePeriodicSubmit}
      />

      <VehicleDeadlineFormModal
        open={page.showDeadlineForm}
        title={
          page.renewingDeadline ? 'تمدید موعد' : page.editingDeadline ? 'ویرایش موعد' : 'موعد جدید'
        }
        initialValues={
          page.editingDeadline
            ? {
                category: page.editingDeadline.category,
                startDate: page.editingDeadline.startDate,
                endDate: page.editingDeadline.endDate,
                amount: page.editingDeadline.amount || '',
                notes: page.editingDeadline.notes
              }
            : undefined
        }
        saving={page.saving}
        onClose={page.closeDeadlineForm}
        onSubmit={page.handleDeadlineSubmit}
      />

      <VehicleCompleteModal
        open={page.showCompleteModal}
        serviceType={page.completingPeriodic?.serviceType ?? ''}
        defaultMileage={page.currentVehicle.mileage}
        initialValues={
          page.completingPeriodic
            ? {
                mileage: String(page.currentVehicle.mileage),
                intervalKm: String(page.completingPeriodic.intervalKm),
                brand: page.completingPeriodic.brand,
                location: page.completingPeriodic.location,
                amount: page.completingPeriodic.amount || '',
                notes: page.completingPeriodic.notes
              }
            : undefined
        }
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
    </div>
  )
}
