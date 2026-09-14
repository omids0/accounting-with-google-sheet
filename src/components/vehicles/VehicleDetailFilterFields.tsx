import type { AppliedDateRangeFilter, DateRangeFilterPreset } from '../DateRangeFilter'
import { CategoryFilterSelect } from '../form'
import PageFilterPanel from '../PageFilterPanel'
import {
  recordsCategorySelectClass,
  recordsFilterLabelClass,
  recordsFilterSectionClassName
} from '../ui/recordsStyles'

type VehicleDetailFilterFieldsProps = {
  isActiveTab: boolean
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
  isActiveTab,
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
  return (
    <PageFilterPanel
      search={draftSearch}
      onSearchChange={setDraftSearch}
      searchPlaceholder={isActiveTab ? 'جستجو در موارد فعال...' : 'جستجو در تاریخچه...'}
      category={draftCategory}
      onCategoryChange={setDraftCategory}
      categoryOptions={categoryOptions}
      categoryLabel={isActiveTab ? 'فوریت' : 'نوع'}
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
      {serviceTypeOptions.length > 0 ? (
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
