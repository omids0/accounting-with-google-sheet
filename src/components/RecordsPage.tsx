import ActiveFilterChips from './ActiveFilterChips'
import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import FilterModal from './FilterModal'
import PageFilterPanel from './PageFilterPanel'
import { isConfigured } from '../services/settings'
import RecordsEditFormModal from './records/RecordsEditFormModal'
import RecordsList from './records/RecordsList'
import RecordsToolbar from './records/RecordsToolbar'
import { useRecordsPage } from './records/useRecordsPage'
import { RecordListSkeleton } from './skeleton'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'
import {
  recordsPageBodyClass,
  recordsPageClass,
  recordsPageMainClass,
  recordsPageSidebarClass
} from './ui/recordsStyles'

export default function RecordsPage({
  initialFormType
}: {
  initialFormType?: 'income' | 'expense'
}) {
  const page = useRecordsPage(initialFormType)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="records" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className={recordsPageClass}>
      <ActiveFilterChips
        chips={page.filterChips}
        onOpenFilters={page.openFilterModal}
        onClearAll={page.clearAllFilters}
      />

      <FilterModal
        open={page.filterModalOpen}
        onClose={() => page.setFilterModalOpen(false)}
        onApply={page.applyFilters}
        onClear={page.clearDraftFilters}
      >
        <PageFilterPanel
          showSearch={false}
          datePreset={page.draftDatePreset}
          customRange={page.draftCustomRange}
          onDateFilterChange={page.handleDraftDateFilterChange}
          dateLoading={page.loading}
          category={page.showCategoryFilter ? page.draftCategory : undefined}
          onCategoryChange={page.showCategoryFilter ? page.setDraftCategory : undefined}
          categoryOptions={page.showCategoryFilter ? page.categoryOptions : undefined}
        />
      </FilterModal>

      <div className={recordsPageBodyClass}>
        <aside className={recordsPageSidebarClass}>
          <RecordsToolbar
            loading={page.loading}
            forms={page.forms}
            activeFormId={page.activeFormId}
            onRefresh={page.loadRecords}
            onFormChange={page.handleFormChange}
          />
        </aside>

        <div className={recordsPageMainClass}>
          {page.loading && page.records.length === 0 ? (
            <RecordListSkeleton />
          ) : page.records.length === 0 ? (
            <div className={emptyStateClass}>
              <div className={emptyStateIconClass}>
                <AppIcon name="empty-inbox" />
              </div>
              <p>هنوز رکوردی ثبت نشده</p>
            </div>
          ) : page.filteredRecords.length === 0 ? (
            <div className={emptyStateClass}>
              <div className={emptyStateIconClass}>
                <AppIcon name="search" />
              </div>
              <p>تراکنشی با این فیلتر یافت نشد</p>
            </div>
          ) : (
            <RecordsList
              forms={page.forms}
              activeForm={page.activeForm}
              isAllForms={page.isAllForms}
              filteredRecords={page.filteredRecords}
              onEdit={page.openEditForm}
              onDelete={page.openDeleteConfirm}
            />
          )}
        </div>
      </div>

      {page.editingForm && page.editingRecord && (
        <RecordsEditFormModal
          open={page.showForm}
          editingForm={page.editingForm}
          editingRecord={page.editingRecord}
          saving={page.saving}
          onClose={page.closeForm}
          onSubmit={page.handleSubmit}
        />
      )}

      <ConfirmDeleteModal
        open={page.deletingRecord !== null}
        message={page.deleteMessage}
        onClose={page.closeDeleteConfirm}
        onConfirm={page.handleDelete}
        deleting={page.deleting}
      />

      <ConfirmActionModal
        open={page.retroactiveWarning.open}
        title={page.retroactiveWarning.title}
        message={page.retroactiveWarning.message}
        confirming={page.retroactiveWarning.confirming}
        confirmLabel={page.retroactiveWarning.confirmLabel}
        onClose={page.retroactiveWarning.cancel}
        onConfirm={page.retroactiveWarning.confirm}
      />
    </div>
  )
}
