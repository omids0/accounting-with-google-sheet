import { listModulePageClass } from './featureCardStyles'
import { reportPageDesktopClass } from './responsiveStyles'
import { cn } from '../../utils/cn'

export const reportPageClass = cn('flex flex-col gap-4 lg:gap-5')

/** Pair chart/table or twin summary cards side-by-side on desktop. */
export const reportPageSplitClass = cn('flex flex-col gap-4', reportPageDesktopClass)

/** Desktop grid for report chart cards (donut/bar pairs). */
export const reportChartsGridClass = cn(
  'grid grid-cols-1 gap-4',
  'lg:grid-cols-2 lg:gap-5 lg:items-start'
)

export const reportFilterBarClass =
  'flex items-start justify-between gap-3 [&_.active-filter-bar]:min-w-0 [&_.active-filter-bar]:flex-1'

export const reportMetaBarClass = 'flex items-center justify-between gap-3'

export const reportMetaSubtitleClass = 'text-[0.78rem] leading-[1.45] text-muted'

export const reportDataTableClass = 'report-data-table overflow-x-auto'

export const reportDataTableHeaderClass = cn(
  'grid grid-cols-[minmax(5.5rem,1.15fr)_repeat(3,minmax(4.75rem,1fr))] items-center gap-2 border-b border-border px-1 pb-2',
  'text-[0.72rem] font-bold text-muted [&_span]:tabular-nums [&_span:not(:first-child)]:text-start'
)

export const reportDataTableRowClass = cn(
  'grid grid-cols-[minmax(5.5rem,1.15fr)_repeat(3,minmax(4.75rem,1fr))] items-center gap-2 border-b border-border px-1 py-[0.65rem] last:border-b-0',
  '[&_span:first-child]:text-[0.88rem] [&_span:first-child]:font-semibold',
  '[&_span:not(:first-child)]:text-start [&_span:not(:first-child)]:text-[0.78rem] [&_span:not(:first-child)]:font-semibold [&_span:not(:first-child)]:tabular-nums'
)

export function reportStatusGroupsClass(groupCount: number) {
  return cn(
    'grid gap-4',
    groupCount <= 1 && 'grid-cols-1',
    groupCount === 2 && 'grid-cols-1 lg:grid-cols-2',
    groupCount >= 3 && 'grid-cols-1 lg:grid-cols-3',
    '[&_.card]:flex [&_.card]:h-full [&_.card]:min-h-[12rem] [&_.card]:flex-col'
  )
}

export const reportHintClass = 'mt-3 text-[0.82rem] text-muted'

export const reportHintWarningClass = 'mt-3 text-[0.82rem] text-expense'

export const reportTableRowClass =
  'flex items-center justify-between gap-3 border-b border-border py-[0.65rem] last:border-b-0'

export const reportTableLabelClass = 'text-[0.88rem] font-semibold'

export const reportTableValuesClass =
  'flex flex-wrap justify-end gap-[0.65rem] text-[0.78rem] font-semibold'

export const reportValueIncomeClass =
  'font-numeric tabular-nums text-income [font-feature-settings:"tnum"_1]'

export const reportValueExpenseClass =
  'font-numeric tabular-nums text-expense [font-feature-settings:"tnum"_1]'

export const reportValuePositiveClass =
  'font-numeric tabular-nums text-income [font-feature-settings:"tnum"_1]'

export const reportValueNegativeClass =
  'font-numeric tabular-nums text-expense [font-feature-settings:"tnum"_1]'

export const reportDueItemEndClass = 'flex flex-col items-end gap-[0.35rem]'

export function reportDueBadgeClass(variant: 'overdue' | 'today' | 'upcoming') {
  return cn(
    'rounded-full px-[0.45rem] py-[0.15rem] text-[0.68rem] font-bold',
    variant === 'overdue' &&
      'bg-[color-mix(in_srgb,var(--color-expense)_14%,transparent)] text-expense',
    variant === 'today' &&
      'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary-dark)]',
    variant === 'upcoming' &&
      'bg-[color-mix(in_srgb,var(--color-income)_14%,transparent)] text-income'
  )
}

export const reportExportCardClass = 'flex items-center justify-between gap-3'

export const reportExportCardBodyClass = 'flex items-center gap-3'

export const reportExportIconClass =
  'flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary'

export const reportExportTitleClass = 'text-[0.9rem] font-bold'

export const reportExportHintClass = 'mt-[0.1rem] text-[0.78rem] text-muted'

export const timesheetsPageClass = listModulePageClass

export const timesheetDetailPageClass = listModulePageClass

export const timesheetDetailStatsClass = 'timesheet-detail-stats'

export const timesheetStatValueClass = 'mt-[0.15rem] text-[1.05rem] font-extrabold text-text'

export const timesheetJiraHoursClass = 'ms-[0.35rem] text-[0.92rem] font-bold text-muted'

export const timesheetEntrySeparatorClass = 'opacity-[0.55]'

export const jalaliDatetimePickerPanelClass = 'overflow-x-auto'

export const jalaliDatetimePickerFieldLabelClass =
  'mb-[0.35rem] block text-[0.78rem] font-semibold text-muted'
