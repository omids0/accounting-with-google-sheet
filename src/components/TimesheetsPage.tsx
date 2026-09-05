import ActiveFilterChips from './ActiveFilterChips'
import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import FilterModal from './FilterModal'
import FormModal from './FormModal'
import ListSortSection from './ListSortSection'
import PageFilterPanel from './PageFilterPanel'
import SearchEmptyState from './SearchEmptyState'
import { InstallmentCardListSkeleton } from './skeleton'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { isConfigured } from '../services/settings'
import { useNavigationStore } from '../stores/navigationStore'
import type { Timesheet } from '../types'
import FormField from './form/FormField'
import TimesheetListCard from './timesheets/TimesheetListCard'
import { useTimesheetsPage } from './timesheets/useTimesheetsPage'

export default function TimesheetsPage({ active = true }: { active?: boolean }) {
  const page = useTimesheetsPage()

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
        onApply={page.applyFilters}
        onClear={page.clearDraftFilters}
      >
        <PageFilterPanel
          search={page.draftSearch}
          onSearchChange={page.setDraftSearch}
          searchPlaceholder="جستجو در تایم‌شیت‌ها..."
        >
          <ListSortSection
            options={page.sortOptions}
            sortId={page.draftSortId}
            onSortIdChange={page.setDraftSortId}
            sortDirection={page.draftSortDirection}
            onSortDirectionChange={page.setDraftSortDirection}
          />
        </PageFilterPanel>
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
            onOpen={(timesheet: Timesheet) =>
              useNavigationStore.getState().onTabChange('timesheet-detail', {
                timesheetId: timesheet.id,

                timesheetTitle: timesheet.title
              })
            }
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
