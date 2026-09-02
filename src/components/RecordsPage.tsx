import AppIcon from './AppIcon'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { FieldInput, sortFormFields } from './form'
import FormModal from './FormModal'
import { RecordListSkeleton } from './skeleton'
import { isConfigured } from '../services/settings'
import RecordsList from './records/RecordsList'
import RecordsToolbar from './records/RecordsToolbar'
import { useRecordsPage } from './records/useRecordsPage'

export default function RecordsPage({
  onReauth,
  initialFormType
}: {
  onReauth?: () => void
  initialFormType?: 'income' | 'expense'
}) {
  const page = useRecordsPage(onReauth, initialFormType)

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="records" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className="records-page">
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
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="empty-inbox" />
          </div>
          <p>هنوز رکوردی ثبت نشده</p>
        </div>
      ) : page.filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
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

      {page.editingForm && (
        <FormModal
          open={page.showForm}
          title={`ویرایش ${page.editingForm.name}`}
          onClose={page.closeForm}
          onSubmit={page.handleSubmit}
          saving={page.saving}
          saveLabel="ذخیره تغییرات"
          saveButtonClassName={`btn ${
            page.editingForm.type === 'expense'
              ? 'btn-outflow'
              : page.editingForm.type === 'income'
              ? 'btn-inflow'
              : 'btn-primary'
          }`}
        >
          {sortFormFields(page.editingForm.fields).map(field => (
            <FieldInput
              key={field.id}
              field={field}
              value={page.formValues[field.id] ?? ''}
              onChange={next => page.setFormValues(prev => ({ ...prev, [field.id]: next }))}
              formId={page.editingForm!.id}
              onReauth={onReauth}
            />
          ))}
        </FormModal>
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
