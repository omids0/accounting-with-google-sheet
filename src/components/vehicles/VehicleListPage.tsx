import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useVehiclesData } from './useVehiclesData'
import VehicleProfileCard from './VehicleProfileCard'
import VehicleProfileFormModal from './VehicleProfileFormModal'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { getPathForTab } from '../../routes/paths'
import { isConfigured } from '../../services/settings'
import AppIcon from '../AppIcon'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import { DangCardListSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import { vehicleHorizontalCardsContainerClass } from './vehicleCardStyles'
import Button from '../ui/Button'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'

export default function VehicleListPage({ active = true }: { active?: boolean }) {
  const data = useVehiclesData()
  const navigate = useNavigate()

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات سرویس خودرو',
      actions: [
        {
          id: 'add',
          label: 'افزودن',
          icon: <SpeedDialIcon name="add" />,
          onClick: data.openCreateForm
        },
        {
          id: 'refresh',
          label: 'بروزرسانی',
          icon: <SpeedDialIcon name="refresh" />,
          onClick: data.loadItems,
          disabled: data.loading
        }
      ]
    }),
    [data.loadItems, data.loading, data.openCreateForm]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

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

  const isInitialLoading = data.loading && data.items.length === 0

  return (
    <div className={listModulePageClass}>
      {isInitialLoading ? (
        <DangCardListSkeleton filterChips={0} />
      ) : data.items.length === 0 ? (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="settings" />
          </div>
          <p>یک خودرو اضافه کنید</p>
          <Button type="button" variant="primary" size="sm" onClick={data.openCreateForm}>
            افزودن خودرو
          </Button>
        </div>
      ) : (
        <div className={vehicleHorizontalCardsContainerClass}>
          {data.items.map(item => (
            <VehicleProfileCard
              key={item.id}
              item={item}
              actionNeededCount={data.actionCountById[item.id] ?? 0}
              onOpen={vehicle =>
                navigate(getPathForTab('vehicle-detail', { vehicleId: vehicle.id }), {
                  state: { title: vehicle.title }
                })
              }
              onEdit={data.openEditForm}
              onDelete={data.openDeleteConfirm}
            />
          ))}
        </div>
      )}

      <VehicleProfileFormModal
        open={data.showForm}
        editingItem={data.editingItem}
        saving={data.saving}
        onClose={data.closeForm}
        onSubmit={data.handleSubmit}
      />

      <ConfirmDeleteModal
        open={data.deletingItem !== null}
        message="از حذف این خودرو مطمئن هستید؟"
        onClose={data.closeDeleteConfirm}
        onConfirm={data.handleDelete}
        deleting={data.deleting}
      />
    </div>
  )
}
