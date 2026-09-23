import type { AppliedDateRangeFilter, DateRangeFilterPreset } from '../DateRangeFilter'
import { CategoryFilterSelect } from '../form'
import PageFilterPanel from '../PageFilterPanel'
import {
  recordsCategorySelectClass,
  recordsFilterLabelClass,
  recordsFilterSectionClassName
} from '../ui/recordsStyles'

type VehicleDetailFilterMode = 'active' | 'deadlines' | 'history' | 'transactions' | 'fuel'

type VehicleDetailFilterFieldsProps = {
  filterMode: VehicleDetailFilterMode
  loading: boolean
  draftSearch: string
  setDraftSearch: (value: string) => void
  draftCategory: string
  setDraftCategory: (value: string) => void
  categoryOptions: string[]
  draftDatePreset?: DateRangeFilterPreset
  draftCustomRange?: AppliedDateRangeFilter['customRange']
  handleDraftDateFilterChange?: (filter: AppliedDateRangeFilter) => void
  draftServiceTypeFilter: string
  setDraftServiceTypeFilter: (value: string) => void
  serviceTypeOptions: string[]
}

export default function VehicleDetailFilterFields({
  filterMode,
  loading,
  draftSearch,
  setDraftSearch,
  draftCategory,
  setDraftCategory,
  categoryOptions,
  draftDatePreset,
  draftCustomRange,
  handleDraftDateFilterChange,
  draftServiceTypeFilter,
  setDraftServiceTypeFilter,
  serviceTypeOptions
}: VehicleDetailFilterFieldsProps) {
  const isActiveTab = filterMode === 'active' || filterMode === 'deadlines'
  const isTransactionsTab = filterMode === 'transactions'
  const isFuelTab = filterMode === 'fuel'
  const searchPlaceholder = isFuelTab
    ? 'جستجو در تراکنش‌های بنزین...'
    : isTransactionsTab
    ? 'جستجو در عنوان...'
    : filterMode === 'deadlines'
    ? 'جستجو در موعدها...'
    : isActiveTab
    ? 'جستجو در موارد فعال...'
    : 'جستجو در تاریخچه...'

  return (
    <PageFilterPanel
      search={draftSearch}
      onSearchChange={setDraftSearch}
      searchPlaceholder={searchPlaceholder}
      {...(isFuelTab
        ? {}
        : {
            category: draftCategory,
            onCategoryChange: setDraftCategory,
            categoryOptions,
            categoryLabel: isTransactionsTab ? 'دسته‌بندی' : isActiveTab ? 'فوریت' : 'نوع'
          })}
      {...(isActiveTab
        ? {}
        : {
            datePreset: draftDatePreset,
            customRange: draftCustomRange,
            onDateFilterChange: handleDraftDateFilterChange,
            dateIncludeAll: true as const,
            dateLabel: 'بازه زمانی (تاریخ)',
            dateLoading: loading
          })}
    >
      {!isTransactionsTab && !isFuelTab && serviceTypeOptions.length > 0 ? (
        <div className={recordsFilterSectionClassName()}>
          <span className={recordsFilterLabelClass}>نوع سرویس</span>
          <CategoryFilterSelect
            className={recordsCategorySelectClass}
            aria-label="نوع سرویس"
            value={draftServiceTypeFilter}
            onChange={setDraftServiceTypeFilter}
            categories={serviceTypeOptions}
          />
        </div>
      ) : null}
    </PageFilterPanel>
  )
}
