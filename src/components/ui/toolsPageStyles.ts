import { cn } from '../../utils/cn'

export const reportPageClass = 'flex flex-col gap-4'

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

export const timesheetDetailPageClass = '[&_.timesheet-detail-stats]:mb-4'

export const timesheetDetailStatsClass = 'mb-4'

export const timesheetStatValueClass = 'mt-[0.15rem] text-[1.05rem] font-extrabold text-text'

export const timesheetJiraHoursClass = 'ms-[0.35rem] text-[0.92rem] font-bold text-muted'

export const timesheetEntryCardClass = 'flex cursor-default items-start gap-3 p-0'

export const timesheetEntryCardCheckedClass = 'opacity-[0.78]'

export const timesheetEntryCheckboxClass = cn(
  'mt-[0.85rem] ms-[0.7rem] h-[1.2rem] w-[1.2rem] flex-shrink-0 cursor-pointer rounded accent-primary'
)

export const timesheetEntryBodyClass = 'min-w-0 flex-1'

export const timesheetEntryHeaderClass = 'cursor-default hover:bg-transparent'

export const timesheetEntrySeparatorClass = 'opacity-[0.55]'

export const timesheetListCardClass = 'cursor-pointer'

export const timesheetListCardMainClass = 'cursor-pointer hover:bg-transparent'

export const jalaliDatetimePickerPanelClass = 'overflow-x-auto'

export const jalaliDatetimePickerFieldLabelClass =
  'mb-[0.35rem] block text-[0.78rem] font-semibold text-muted'
