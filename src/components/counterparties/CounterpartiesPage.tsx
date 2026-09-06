import { useMemo } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import { DangCardListSkeleton } from '../skeleton'
import CounterpartyFormModal from './CounterpartyFormModal'
import CounterpartyList from './CounterpartyList'
import type { CounterpartiesPageProps } from './types'
import { useCounterpartiesData } from './useCounterpartiesData'
import { useCounterpartiesFilters } from './useCounterpartiesFilters'
import { useCounterpartiesForm } from './useCounterpartiesForm'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

export default function CounterpartiesPage({ active = true }: CounterpartiesPageProps) {
  const data = useCounterpartiesData()
  const form = useCounterpartiesForm({ onSaved: data.loadItems })

  const {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftDatePreset,
    draftCustomRange,
    filteredItems,
    openFilterModal,
    filterChips,
    clearAllFilters,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  } = useCounterpartiesFilters({ items: data.items })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات طرف حساب‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => form.openCreateForm(),
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
      form.openCreateForm,
      openFilterModal
    ]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="counterparties" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  const isInitialLoading = data.loading && data.items.length === 0

  return (
    <div>
      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={applyFilters}
        onClear={clearDraftFilters}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در طرف حساب‌ها..."
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={handleDraftDateFilterChange}
          dateIncludeAll
          dateLabel="بازه زمانی (تاریخ تولد)"
          dateLoading={data.loading}
        />
      </FilterModal>

      {isInitialLoading ? (
        <DangCardListSkeleton filterChips={0} />
      ) : (
        <>
          <ActiveFilterChips
            chips={filterChips}
            onOpenFilters={openFilterModal}
            onClearAll={clearAllFilters}
          />

          <CounterpartyList
            items={data.items}
            filteredItems={filteredItems}
            onEdit={form.openEditForm}
            onDelete={data.openDeleteConfirm}
          />
        </>
      )}

      <CounterpartyFormModal
        open={form.showForm}
        editingItem={form.editingItem}
        saving={form.saving}
        onClose={form.closeForm}
        onSubmit={form.handleSubmit}
      />

      <ConfirmActionModal {...data.importExportConfirmModal} />

      <ConfirmDeleteModal
        open={data.deletingItem !== null}
        message="از حذف این طرف حساب مطمئن هستید؟"
        onClose={data.closeDeleteConfirm}
        onConfirm={data.handleDelete}
        deleting={data.deleting}
      />
    </div>
  )
}
