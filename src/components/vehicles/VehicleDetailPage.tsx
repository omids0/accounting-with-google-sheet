import { isConfigured } from '../../services/settings'
import AppIcon from '../AppIcon'
import { DangCardListSkeleton } from '../skeleton'
import type { VehicleProfileWithRow } from './types'
import { useVehicleDetail } from './useVehicleDetail'
import VehicleActiveItemCard from './VehicleActiveItemCard'
import { vehicleHorizontalCardsContainerClass } from './vehicleCardStyles'
import VehicleCompleteModal from './VehicleCompleteModal'
import VehicleDeadlineFormModal from './VehicleDeadlineFormModal'
import VehicleHistoryCard from './VehicleHistoryCard'
import VehicleItemDeleteModal from './VehicleItemDeleteModal'
import VehicleMechanicFormModal from './VehicleMechanicFormModal'
import VehicleMileageModal from './VehicleMileageModal'
import VehiclePeriodicFormModal from './VehiclePeriodicFormModal'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import Button from '../ui/Button'
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

  useRegisterPageSpeedDial(isConfigured() ? page.pageSpeedDialConfig : null, active)

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
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={page.detailTab === 'active' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => page.setDetailTab('active')}
        >
          موارد فعال ({page.activeItems.length.toLocaleString('fa-IR')})
        </Button>
        <Button
          type="button"
          variant={page.detailTab === 'history' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => page.setDetailTab('history')}
        >
          تاریخچه ({page.history.length.toLocaleString('fa-IR')})
        </Button>
      </div>

      <div className="mb-4 rounded-sm border border-border bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,transparent)] p-3 text-[0.85rem]">
        کارکرد فعلی: <strong>{page.currentVehicle.mileage.toLocaleString('fa-IR')} km</strong>
        {page.currentVehicle.plate ? ` · پلاک: ${page.currentVehicle.plate}` : ''}
      </div>

      {page.loading && page.activeItems.length === 0 && page.history.length === 0 ? (
        <DangCardListSkeleton filterChips={0} />
      ) : page.detailTab === 'active' ? (
        page.activeItems.length === 0 ? (
          <div className={emptyStateClass}>
            <div className={emptyStateIconClass}>
              <AppIcon name="settings" />
            </div>
            <p>مورد فعالی ثبت نشده</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => page.setDetailTab('active')}
            >
              افزودن از منوی عملیات
            </Button>
          </div>
        ) : (
          <div className={vehicleHorizontalCardsContainerClass}>
            {page.activeItems.map(item => (
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
        )
      ) : page.history.length === 0 ? (
        <div className={emptyStateClass}>
          <p>تاریخچه‌ای ثبت نشده</p>
        </div>
      ) : (
        <div className={vehicleHorizontalCardsContainerClass}>
          {page.history.map(item => (
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
        saving={page.saving}
        onClose={page.closeMechanicForm}
        onSubmit={page.handleMechanicSubmit}
      />

      <VehicleMileageModal
        open={page.showMileageModal}
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
