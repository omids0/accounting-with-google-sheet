import ActiveFilterChips from './ActiveFilterChips'
import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { createDefaultDateRangeFilter } from './DateRangeFilter'
import FilterModal from './FilterModal'
import FormModal from './FormModal'
import PageFilterPanel from './PageFilterPanel'
import SearchEmptyState from './SearchEmptyState'
import { InstallmentCardListSkeleton } from './skeleton'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { isConfigured } from '../services/settings'
import type { Timesheet } from '../types'
import { formatDurationFa, formatJiraTimesheetHours } from '../utils/datetime'
import TimesheetEntryCard from './timesheets/TimesheetEntryCard'
import TimesheetEntryForm from './timesheets/TimesheetEntryForm'
import { useTimesheetDetailPage } from './timesheets/useTimesheetDetailPage'

export default function TimesheetDetailPage({
  timesheet,
  onReauth,
  active = true
}: {
  timesheet: Timesheet
  onReauth?: () => void
  active?: boolean
}) {
  const page = useTimesheetDetailPage(timesheet, onReauth)

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
        onApply={() => {
          page.setSearchQuery(page.draftSearch)
          page.setDatePreset(page.draftDatePreset)
          page.setCustomRange(page.draftCustomRange)
          page.setFilterModalOpen(false)
        }}
        onClear={() => {
          const defaults = createDefaultDateRangeFilter()

          page.setDraftSearch('')
          page.setDraftDatePreset(defaults.preset)
          page.setDraftCustomRange(defaults.customRange)
        }}
      >
        <PageFilterPanel
          search={page.draftSearch}
          onSearchChange={page.setDraftSearch}
          searchPlaceholder="جستجو در رکوردها..."
          datePreset={page.draftDatePreset}
          customRange={page.draftCustomRange}
          onDateFilterChange={filter => {
            page.setDraftDatePreset(filter.preset)
            page.setDraftCustomRange(filter.customRange)
          }}
          dateIncludeAll
          dateLabel="بازه زمانی (تاریخ شروع)"
          dateLoading={page.loading}
        />
      </FilterModal>

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

      {page.loading && page.items.length === 0 ? (
        <InstallmentCardListSkeleton footerStats={0} />
      ) : page.items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="clock" />
          </div>
          <p>هنوز رکوردی ثبت نشده</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={page.openCreateForm}>
            افزودن رکورد
          </button>
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

      <FormModal
        open={page.showForm}
        title={page.editingItem ? 'ویرایش رکورد' : 'رکورد جدید'}
        onClose={() => page.setShowForm(false)}
        onSubmit={page.handleSubmit}
        saving={page.saving}
        saveLabel={page.editingItem ? 'ذخیره' : 'ثبت'}
      >
        <TimesheetEntryForm
          form={page.form}
          durationMinutes={page.durationMinutes}
          endPickerOpenToken={page.endPickerOpenToken}
          onFormChange={patch => page.setForm(prev => ({ ...prev, ...patch }))}
          onStartChange={page.handleStartChange}
          onEndChange={page.handleEndChange}
        />
      </FormModal>

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
