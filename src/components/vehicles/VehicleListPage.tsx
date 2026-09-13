import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useVehiclesData } from './useVehiclesData'
import { useVehiclesFilters } from './useVehiclesFilters'
import MileageRangeFilter from '../MileageRangeFilter'
import VehicleProfileCard from './VehicleProfileCard'
import VehicleProfileFormModal from './VehicleProfileFormModal'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { getPathForTab } from '../../routes/paths'
import { isConfigured } from '../../services/settings'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import { vehicleHorizontalCardsContainerClass } from './vehicleCardStyles'
import Button from '../ui/Button'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'

export default function VehicleListPage({ active = true }: { active?: boolean }) {
  const data = useVehiclesData()
  const navigate = useNavigate()

  const {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftPaymentStatus,
    setDraftPaymentStatus,
    draftMileageRange,
    setDraftMileageRange,
    mileageSliderMax,
    filteredItems,
    openFilterModal,
    filterChips,
    clearAllFilters,
    applyFilters,
    clearDraftFilters
  } = useVehiclesFilters({
    items: data.items,
    actionCountById: data.actionCountById
  })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات سرویس خودرو',
      actions: createPageSpeedDialActions({
        onAdd: data.openCreateForm,
        onFilter: openFilterModal,
        onRefresh: data.loadItems,
        refreshDisabled: data.loading,
        onImport: data.handleImport,
        onExport: data.handleExport,
        onExportPdf: data.handleExportPdf
      })
    }),
    [
      data.handleExport,
      data.handleExportPdf,
      data.handleImport,
      data.loadItems,
      data.loading,
      data.openCreateForm,
      openFilterModal
    ]
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
      <ActiveFilterChips
        chips={filterChips}
        onOpenFilters={openFilterModal}
        onClearAll={clearAllFilters}
      />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={applyFilters}
        onClear={clearDraftFilters}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در خودروها..."
          paymentStatus={draftPaymentStatus}
          onPaymentStatusChange={setDraftPaymentStatus}
          paymentStatusLabel="وضعیت اقدام"
          paymentStatusPaidLabel="بدون اقدام"
          paymentStatusUnpaidLabel="نیاز به اقدام"
        >
          <MileageRangeFilter
            value={draftMileageRange}
            onChange={setDraftMileageRange}
            sliderMax={mileageSliderMax}
          />
        </PageFilterPanel>
      </FilterModal>

      {isInitialLoading ? (
        <DangCardListSkeleton filterChips={filterChips.length} />
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
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <div className={vehicleHorizontalCardsContainerClass}>
          {filteredItems.map(item => (
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

      <ConfirmActionModal {...data.importExportConfirmModal} />
    </div>
  )
}
