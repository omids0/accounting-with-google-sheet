import ActiveFilterChips from './ActiveFilterChips'
import EmptyState from './EmptyState'
import FilterModal from './FilterModal'
import PageFilterPanel from './PageFilterPanel'
import SearchEmptyState from './SearchEmptyState'
import { isConfigured } from '../services/settings'
import { useNavigationStore } from '../stores/navigationStore'
import RecordsExtraFilterFields from './records/RecordsExtraFilterFields'
import RecordsList from './records/RecordsList'
import RecordsPageOverlays from './records/RecordsPageOverlays'
import RecordsSummary from './records/RecordsSummary'
import RecordsToolbar from './records/RecordsToolbar'
import { useRecordDetail } from './records/useRecordDetail'
import { useRecordsPage } from './records/useRecordsPage'
import { useRecordsSpeedDial } from './records/useRecordsSpeedDial'
import SharedNoticeSlot from './shared/SharedNoticeSlot'
import { RecordListSkeleton } from './skeleton'
import {
  recordsPageBodyClass,
  recordsPageClass,
  recordsPageMainClass,
  recordsPageSidebarClass
} from './ui/recordsStyles'

export default function RecordsPage({
  initialFormType,
  focusRecordId,
  openEdit,
  openDetail,
  initialCounterparty,
  initialRange
}: {
  initialFormType?: 'income' | 'expense'
  focusRecordId?: string
  /** Also open the focused record's edit form once it loads. */
  openEdit?: boolean
  /** Also open the focused record's detail sheet once it loads. */
  openDetail?: boolean
  /** From a report link: start filtered to one counterparty, over a date range. */
  initialCounterparty?: string
  initialRange?: { start: string; end: string }
}) {
  const page = useRecordsPage(
    initialFormType,
    focusRecordId,
    openEdit,
    initialCounterparty,
    initialRange
  )

  const detail = useRecordDetail(page.records, openDetail ? focusRecordId : undefined)

  useRecordsSpeedDial({
    forms: page.forms,
    filteredRecords: page.filteredRecords,
    loading: page.loading,
    incomeFormName: page.forms.find(form => form.type === 'income')?.name ?? 'درآمد',
    expenseFormName: page.forms.find(form => form.type === 'expense')?.name ?? 'هزینه',
    onOpenFilters: page.openFilterModal,
    onRefresh: page.loadRecords
  })

  if (!isConfigured()) {
    return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />
  }

  return (
    <div className={recordsPageClass}>
      <SharedNoticeSlot onApplied={page.loadRecords} />
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
          subCategory={page.subcategory.showDraft ? page.subcategory.draftSubCategory : undefined}
          onSubCategoryChange={
            page.subcategory.showDraft ? page.subcategory.setDraftSubCategory : undefined
          }
          subCategoryOptions={
            page.subcategory.showDraft ? page.subcategory.draftOptions : undefined
          }
          counterparty={page.extra.showCounterparty ? page.extra.draftCounterparty : undefined}
          onCounterpartyChange={page.extra.setDraftCounterparty}
          counterpartyOptions={page.extra.showCounterparty ? page.extra.options : undefined}
          {...page.extra.minePanelProps}
        >
          <RecordsExtraFilterFields extra={page.extra} />
        </PageFilterPanel>
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
            <EmptyState
              icon="empty-inbox"
              description="همه درآمدها و هزینه‌هایت این‌جا فهرست می‌شوند؛ با فیلتر و جستجو هر تراکنشی را پیدا کن."
              message="هنوز رکوردی ثبت نشده"
              action={{
                label: 'ثبت تراکنش',
                onClick: () => useNavigationStore.getState().onOpenEntry()
              }}
            />
          ) : page.filteredRecords.length === 0 ? (
            <SearchEmptyState />
          ) : (
            <>
              <RecordsList
                // A new filter or form starts the list over at its first page.
                key={`${page.activeFormId}|${page.filterChips.map(chip => chip.label).join('|')}`}
                forms={page.forms}
                activeForm={page.activeForm}
                isAllForms={page.isAllForms}
                filteredRecords={page.filteredRecords}
                onEdit={page.openEditForm}
                onDelete={page.requestDelete}
                onOpen={detail.open}
              />
              <RecordsSummary
                filteredRecords={page.filteredRecords}
                forms={page.forms}
                activeForm={page.activeForm}
                isAllForms={page.isAllForms}
                showFilteredLabel={page.showFilteredSummary}
              />
            </>
          )}
        </div>
      </div>

      <RecordsPageOverlays page={page} detail={detail} />
    </div>
  )
}
