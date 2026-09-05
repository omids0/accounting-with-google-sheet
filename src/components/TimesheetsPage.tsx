import ActiveFilterChips from './ActiveFilterChips'
import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import FilterModal from './FilterModal'
import ListSortSection from './ListSortSection'
import PageFilterPanel from './PageFilterPanel'
import SearchEmptyState from './SearchEmptyState'
import { InstallmentCardListSkeleton } from './skeleton'
import Button from './ui/Button'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'
import { timesheetsPageClass } from './ui/toolsPageStyles'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { isConfigured } from '../services/settings'
import { useNavigationStore } from '../stores/navigationStore'
import type { Timesheet } from '../types'
import TimesheetFormModal from './timesheets/TimesheetFormModal'
import TimesheetListCard from './timesheets/TimesheetListCard'
import { useTimesheetsPage } from './timesheets/useTimesheetsPage'

export default function TimesheetsPage({ active = true }: { active?: boolean }) {
  const page = useTimesheetsPage()

  useRegisterPageSpeedDial(isConfigured() ? page.pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="clock" />
        </div>

        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className={timesheetsPageClass}>
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
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="clock" />
          </div>

          <p>هنوز تایم‌شیتی ثبت نشده</p>

          <Button type="button" variant="primary" size="sm" onClick={page.openCreateForm}>
            افزودن تایم‌شیت
          </Button>
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

      <TimesheetFormModal
        open={page.showForm}
        editingItem={page.editingItem}
        saving={page.saving}
        onClose={page.closeForm}
        onSubmit={page.handleSubmit}
      />

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
