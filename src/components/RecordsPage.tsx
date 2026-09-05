import AppIcon from './AppIcon'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { RecordListSkeleton } from './skeleton'
import { isConfigured } from '../services/settings'
import RecordsEditFormModal from './records/RecordsEditFormModal'
import RecordsList from './records/RecordsList'
import RecordsToolbar from './records/RecordsToolbar'
import { useRecordsPage } from './records/useRecordsPage'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'
import { recordsPageClass } from './ui/recordsStyles'

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
      <RecordsToolbar
        dateRange={page.dateRange}
        loading={page.loading}
        forms={page.forms}
        activeFormId={page.activeFormId}
        datePreset={page.datePreset}
        customRange={page.customRange}
        showCategoryFilter={!!page.showCategoryFilter}
        categoryFilter={page.categoryFilter}
        categoryOptions={page.categoryOptions}
        onRefresh={page.loadRecords}
        onFormChange={page.handleFormChange}
        onDateFilterChange={page.handleDateFilterChange}
        onCategoryChange={page.setCategoryFilter}
      />

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
        message="از حذف این مورد مطمئن هستید؟"
        onClose={page.closeDeleteConfirm}
        onConfirm={page.handleDelete}
        deleting={page.deleting}
      />
    </div>
  )
}
