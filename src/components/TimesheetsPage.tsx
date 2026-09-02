import ActiveFilterChips from './ActiveFilterChips'
import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import FilterModal from './FilterModal'
import FormModal from './FormModal'
import SearchEmptyState from './SearchEmptyState'
import { InstallmentCardListSkeleton } from './skeleton'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { isConfigured } from '../services/settings'
import type { Timesheet } from '../types'
import FormField from './form/FormField'
import TimesheetListCard from './timesheets/TimesheetListCard'
import { useTimesheetsPage } from './timesheets/useTimesheetsPage'

export default function TimesheetsPage({
  onReauth,
  active = true,
  onOpenTimesheet
}: {
  onReauth?: () => void
  active?: boolean
  onOpenTimesheet: (timesheet: Timesheet) => void
}) {
  const page = useTimesheetsPage(onReauth)

  useRegisterPageSpeedDial(isConfigured() ? page.pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="clock" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
      <ActiveFilterChips chips={page.filterChips} onChipClick={page.openFilterModal} />

      <FilterModal
        open={page.filterModalOpen}
        onClose={() => page.setFilterModalOpen(false)}
        onApply={() => {
          page.setSearchQuery(page.draftSearch)
          page.setFilterModalOpen(false)
        }}
        onClear={() => page.setDraftSearch('')}
      >
        <FormField label="جستجو">
          <input
            type="search"
            className="form-control"
            value={page.draftSearch}
            onChange={e => page.setDraftSearch(e.target.value)}
            placeholder="جستجو در تایم‌شیت‌ها..."
          />
        </FormField>
      </FilterModal>

      {page.loading && page.items.length === 0 ? (
        <InstallmentCardListSkeleton footerStats={0} />
      ) : page.items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="clock" />
          </div>
          <p>هنوز تایم‌شیتی ثبت نشده</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={page.openCreateForm}>
            افزودن تایم‌شیت
          </button>
        </div>
      ) : page.filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        page.filteredItems.map(item => (
          <TimesheetListCard
            key={item.id}
            item={item}
            onOpen={onOpenTimesheet}
            onEdit={page.openEditForm}
            onDelete={page.setDeletingItem}
          />
        ))
      )}

      <FormModal
        open={page.showForm}
        title={page.editingItem ? 'ویرایش تایم‌شیت' : 'تایم‌شیت جدید'}
        onClose={() => page.setShowForm(false)}
        onSubmit={page.handleSubmit}
        saving={page.saving}
        saveLabel={page.editingItem ? 'ذخیره' : 'ایجاد'}
      >
        <FormField label="عنوان" required>
          <input
            type="text"
            className="form-control"
            value={page.form.title}
            onChange={e => page.setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="مثلاً: پروژه الف"
            autoFocus
          />
        </FormField>
        <FormField label="توضیحات" className="form-field-note">
          <textarea
            className="form-control form-note-textarea"
            rows={3}
            value={page.form.description}
            onChange={e => page.setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="توضیحات اضافه..."
          />
        </FormField>
      </FormModal>

      <ConfirmDeleteModal
        open={page.deletingItem !== null}
        title="حذف تایم‌شیت"
        message={`آیا از حذف «${page.deletingItem?.title ?? ''}» و تمام رکوردهای آن اطمینان دارید؟`}
        deleting={page.deleting}
        onClose={() => page.setDeletingItem(null)}
        onConfirm={page.handleDelete}
      />

      <ConfirmActionModal {...page.importExportConfirmModal} />
    </div>
  )
}
