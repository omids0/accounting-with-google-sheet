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
import PersonalReminderFormModal from './PersonalReminderFormModal'
import PersonalReminderList from './PersonalReminderList'
import type { PersonalRemindersPageProps } from './types'
import { usePersonalRemindersData } from './usePersonalRemindersData'
import { usePersonalRemindersFilters } from './usePersonalRemindersFilters'
import { usePersonalRemindersForm } from './usePersonalRemindersForm'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

export default function PersonalRemindersPage({ active = true }: PersonalRemindersPageProps) {
  const data = usePersonalRemindersData()
  const form = usePersonalRemindersForm({ onSaved: data.loadItems })

  const {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftPaymentStatus,
    setDraftPaymentStatus,
    draftCategory,
    setDraftCategory,
    draftDatePreset,
    draftCustomRange,
    categoryOptions,
    filteredItems,
    openFilterModal,
    filterChips,
    clearAllFilters,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters
  } = usePersonalRemindersFilters({ items: data.items })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات یادآوری',
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
          <AppIcon name="bell" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
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
          searchPlaceholder="جستجو در یادآوری‌ها..."
          paymentStatus={draftPaymentStatus}
          onPaymentStatusChange={setDraftPaymentStatus}
          paymentStatusPaidLabel="غیرفعال"
          paymentStatusUnpaidLabel="فعال"
          category={draftCategory}
          onCategoryChange={setDraftCategory}
          categoryOptions={categoryOptions}
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={handleDraftDateFilterChange}
          dateIncludeAll
          dateLabel="بازه زمانی (موعد)"
          dateLoading={data.loading}
        />
      </FilterModal>

      <PersonalReminderList
        items={data.items}
        filteredItems={filteredItems}
        loading={data.loading}
        completingId={data.completingId}
        onComplete={data.openCompleteConfirm}
        onEdit={form.openEditForm}
        onDelete={data.openDeleteConfirm}
      />

      <PersonalReminderFormModal
        open={form.showForm}
        editingItem={form.editingItem}
        saving={form.saving}
        onClose={form.closeForm}
        onSubmit={form.handleSubmit}
      />

      <ConfirmActionModal
        open={data.completingItem !== null}
        title="ثبت انجام یادآوری"
        message={data.completionMessage}
        onClose={data.closeCompleteConfirm}
        onConfirm={data.handleComplete}
        confirming={Boolean(data.completingId)}
        confirmLabel="تأیید"
      />

      <ConfirmActionModal {...data.importExportConfirmModal} />

      <ConfirmDeleteModal
        open={data.deletingItem !== null}
        message="از حذف این یادآوری مطمئن هستید؟"
        onClose={data.closeDeleteConfirm}
        onConfirm={data.handleDelete}
        deleting={data.deleting}
      />
    </div>
  )
}
