import ActiveFilterChips from './ActiveFilterChips'
import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import FilterModal from './FilterModal'
import ListSortSection from './ListSortSection'
import PageFilterPanel from './PageFilterPanel'
import SearchEmptyState from './SearchEmptyState'
import { TimesheetDetailListSkeleton } from './skeleton'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { isConfigured } from '../services/settings'
import type { Timesheet } from '../types'
import { formatDurationFa, formatJiraTimesheetHours } from '../utils/datetime'
import TimesheetEntryCard from './timesheets/TimesheetEntryCard'
import TimesheetEntryFormModal from './timesheets/TimesheetEntryFormModal'
import { useTimesheetDetailPage } from './timesheets/useTimesheetDetailPage'
import Button from './ui/Button'

export default function TimesheetDetailPage({
  timesheet,
  active = true
}: {
  timesheet: Timesheet
  active?: boolean
}) {
  const page = useTimesheetDetailPage(timesheet)

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
    <div className="timesheet-detail-page">
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
          searchPlaceholder="جستجو در رکوردها..."
          paymentStatus={page.draftPaymentStatus}
          onPaymentStatusChange={page.setDraftPaymentStatus}
          paymentStatusLabel="وضعیت تایید"
          paymentStatusPaidLabel="تایید شده"
          paymentStatusUnpaidLabel="تایید نشده"
          datePreset={page.draftDatePreset}
          customRange={page.draftCustomRange}
          onDateFilterChange={page.handleDraftDateFilterChange}
          dateIncludeAll
          dateLabel="بازه زمانی (تاریخ شروع)"
          dateLoading={page.loading}
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
        <TimesheetDetailListSkeleton />
      ) : (
        <>
          <div className="stat-grid dashboard-stat-grid timesheet-detail-stats">
            <div className="stat-card">
              <span className="stat-label">مجموع کارکرد</span>
              <div className="timesheet-stat-value">
                {formatDurationFa(page.totalMinutes)}
                {page.totalMinutes > 0 && (
                  <span className="timesheet-jira-hours" dir="ltr">
                    ({formatJiraTimesheetHours(page.totalMinutes)})
                  </span>
                )}
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">تعداد رکورد</span>
              <div className="timesheet-stat-value">
                {page.filteredItems.length.toLocaleString('fa-IR')}
              </div>
            </div>
          </div>

          {page.items.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <AppIcon name="clock" />
              </div>
              <p>هنوز رکوردی ثبت نشده</p>
              <Button type="button" variant="primary" size="sm" onClick={page.openCreateForm}>
                افزودن رکورد
              </Button>
            </div>
          ) : page.filteredItems.length === 0 ? (
            <SearchEmptyState />
          ) : (
            page.filteredItems.map(item => (
              <TimesheetEntryCard
                key={item.id}
                item={item}
                togglingCheckId={page.togglingCheckId}
                onToggleChecked={page.handleToggleChecked}
                onEdit={page.openEditForm}
                onDelete={page.setDeletingItem}
              />
            ))
          )}
        </>
      )}

      <TimesheetEntryFormModal
        open={page.showForm}
        editingItem={page.editingItem}
        saving={page.saving}
        onClose={page.closeForm}
        onSubmit={page.handleSubmit}
      />

      <ConfirmDeleteModal
        open={page.deletingItem !== null}
        title="حذف رکورد"
        message={`آیا از حذف «${page.deletingItem?.title ?? ''}» اطمینان دارید؟`}
        deleting={page.deleting}
        onClose={() => page.setDeletingItem(null)}
        onConfirm={page.handleDelete}
      />

      <ConfirmActionModal {...page.importExportConfirmModal} />
    </div>
  )
}
