import { cardClassName } from './Card'
import { cn } from '../../utils/cn'

export const recordsPageClass = 'flex flex-col gap-3'

export const recordsToolbarClass = cn(
  'relative z-[2] mb-0 overflow-hidden rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border))] p-4',
  '[background:linear-gradient(165deg,var(--color-surface)_0%,color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))_100%)] shadow-[var(--shadow)] [.records-page_&]:mb-0'
)

export const recordsToolbarHeaderClass = 'mb-[0.85rem] flex items-start justify-between gap-3'

export const recordsToolbarHeaderExpandedClass = '[.dashboard-toolbar_&]:mb-[0.85rem]'

export const recordsToolbarHeadingClass = 'min-w-0'

export const recordsToolbarTitleClass =
  'm-0 mb-[0.2rem] text-base font-bold tracking-[-0.01em] text-primary-dark'

export const recordsToolbarRangeClass = 'm-0 text-[0.72rem] leading-[1.4] text-muted'

export const recordsRefreshBtnClass = 'min-w-[2.25rem] shrink-0'

export const recordsTypeSegmentClass = cn(
  'mb-[0.85rem] flex gap-[3px] rounded-[var(--radius)] bg-bg p-[3px]',
  '[&_button]:flex-1 [&_button]:rounded-[calc(var(--radius)-2px)] [&_button]:px-2 [&_button]:py-[0.55rem] [&_button]:text-[0.82rem] [&_button]:font-semibold [&_button]:text-muted [&_button]:bg-transparent [&_button]:transition-[background,color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  '[&_button.active]:bg-surface [&_button.active]:shadow-[0_1px_4px_rgba(0,0,0,0.08)] [&_button.active.income]:text-success [&_button.active.expense]:text-danger'
)

export const recordsFilterSectionClass = 'flex flex-col gap-[0.45rem]'

export const recordsFilterSectionInlineClass = 'flex-row items-center gap-[0.65rem]'

export const recordsFilterSectionDividerClass = cn(
  'mt-3 border-t border-border pt-3',
  '[.records-filter-section+&]:mt-3 [.records-filter-section+&]:border-t [.records-filter-section+&]:border-border [.records-filter-section+&]:pt-3',
  '[.records-custom-range+&]:mt-3 [.records-custom-range+&]:border-t [.records-custom-range+&]:border-border [.records-custom-range+&]:pt-3'
)

export function recordsFilterSectionClassName(inline?: boolean) {
  return cn(recordsFilterSectionClass, inline && recordsFilterSectionInlineClass)
}

export const recordsFilterLabelClass = 'shrink-0 text-[0.75rem] font-semibold text-muted'

export const recordsFilterLabelInlineClass = 'min-w-[4.25rem]'

export const recordsFilterActionsClass = cn(
  'flex w-full flex-col gap-2',
  '[&_button]:!w-full [&_button]:min-h-[2.65rem] [&_button]:px-4 [&_button]:text-[0.88rem]'
)

export const recordsDateGridClass = cn(
  'grid grid-cols-2 gap-[0.4rem]',
  '[&_button]:rounded-[var(--radius)] [&_button]:border [&_button]:border-border [&_button]:bg-bg [&_button]:px-[0.35rem] [&_button]:py-[0.48rem] [&_button]:text-[0.76rem] [&_button]:font-semibold [&_button]:text-muted [&_button]:transition-[background,color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  '[&_button.active]:border-primary [&_button.active]:bg-primary [&_button.active]:text-white'
)

export const recordsSortDirectionGridClass = 'mt-[0.45rem]'

export const recordsCategorySelectClass = 'min-w-0 flex-1'

export const recordsCustomRangeClass = 'flex flex-col gap-2'

export const recordsCustomDateClass = 'flex min-w-0 flex-col gap-[0.35rem]'

export const recordsListCardClass = 'relative z-[1] mb-0 px-4 pb-1 pt-0'

export const recordsListHeaderClass =
  'mb-[0.15rem] flex items-center justify-between border-b border-border py-[0.65rem_0.5rem]'

export const recordsListCountClass = 'text-[0.75rem] font-semibold text-muted'

export function recordsListTypeClass(type: 'income' | 'expense') {
  return cn(
    'rounded-full px-2 py-[0.15rem] text-[0.72rem] font-semibold',
    type === 'income' &&
      'border border-[var(--color-income-border)] bg-[var(--color-income-bg)] text-[var(--color-income)]',
    type === 'expense' &&
      'border border-[var(--color-expense-border)] bg-[var(--color-expense-bg)] text-[var(--color-expense)]'
  )
}

export const recordItemTitleClass =
  'overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-semibold'

export const recordItemMetaClass = 'text-[0.75rem] text-muted'

export const recordItemInteractiveClass = cn(
  'relative -mx-[0.65rem] animate-[recordItemIn_0.4s_var(--ease-page)_both] rounded-sm border-b-transparent px-[0.65rem] py-[0.85rem] transition-[background,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  '[&+&]:border-t [&+&]:border-border',
  'hover:-translate-x-[3px] hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_65%,transparent)] hover:shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-primary)_35%,transparent)]',
  'active:scale-[0.995] active:-translate-x-px',
  'motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-x-0'
)

export const recordItemAccentClass = cn(
  'pointer-events-none absolute top-1/2 right-0 h-0 w-[3px] -translate-y-1/2 rounded-full opacity-0 transition-[height,opacity] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
  '[.record-item--interactive:hover_&]:h-[60%] [.record-item--interactive:hover_&]:opacity-100',
  '[.record-item--income_&]:bg-[var(--color-income)]',
  '[.record-item--expense_&]:bg-[var(--color-expense)]',
  '[.record-item--neutral_&]:bg-primary'
)

export const amountIncomeClass =
  'amount-income font-numeric tabular-nums text-success [font-feature-settings:"tnum"_1]'

export const amountExpenseClass =
  'amount-expense font-numeric tabular-nums text-danger [font-feature-settings:"tnum"_1]'

export const receivablesFiltersCardClass = cn(
  cardClassName(),
  'mb-3 overflow-hidden border-accent-mid bg-accent-soft p-0 shadow-none hover:shadow-none'
)

export const receivablesFiltersToggleClass = 'rounded-none px-3 py-[0.55rem]'

export const receivablesFiltersTitleClass = 'text-[0.88rem] font-semibold text-primary-dark'

export const receivablesFiltersBodyClass = 'border-t border-accent-mid px-3 pb-[0.65rem]'

export const receivablesFiltersBodySectionsClass =
  '[&_.records-filter-section]:gap-[0.35rem] [&_.records-filter-section:first-child]:mt-2 [&_.records-filter-section+_.records-filter-section]:mt-2 [&_.records-filter-section+_.records-filter-section]:border-t [&_.records-filter-section+_.records-filter-section]:border-accent-mid [&_.records-filter-section+_.records-filter-section]:pt-2'

export const receivablesFiltersRangeClass = 'mt-[0.35rem]'

export const dataEntryTypeSegmentClass = 'mb-4'

export const formFieldNoteClass = 'mb-[1.15rem]'

export const fieldRowClass = cn(
  'mb-3 flex items-start gap-2 rounded-lg bg-bg p-3',
  '[&_.form-group]:mb-0 [&_.form-group]:flex-1 [&_.remove-btn]:mt-6 [&_.remove-btn]:p-2 [&_.remove-btn]:text-[1.1rem] [&_.remove-btn]:text-danger'
)

export const cardHeaderRowClass = 'flex items-center justify-between'

export const pageHeaderRowClass = 'mb-2 gap-2'

export const pageToolbarClass = 'mb-2'

export const dashboardTransactionSegmentClass = 'my-[0.85rem_0.75rem] mt-[0.85rem]'

export const alertWarningClass =
  'rounded-[var(--radius)] border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-3 text-[var(--color-warning)]'

export const dashboardReconcileAlertClass =
  'mb-4 text-[0.82rem] leading-[1.5] [&_p]:m-[0.35rem_0_0]'

export const dashboardReconcileFormulaClass = 'text-[0.72rem] opacity-85'

export const reconcileDiffClass = 'font-bold'

export const toggleChipGridClass = cn(
  'flex flex-wrap gap-[0.45rem]',
  '[&_button]:rounded-full [&_button]:border [&_button]:border-border [&_button]:bg-bg [&_button]:px-[0.85rem] [&_button]:py-[0.45rem] [&_button]:text-[0.78rem] [&_button]:font-semibold [&_button]:text-muted [&_button]:transition-[background,color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  '[&_button.active]:border-primary [&_button.active]:bg-primary [&_button.active]:text-white'
)

export function toggleChipBtnClass(active?: boolean) {
  return active ? 'active' : ''
}

export function recordsDateGridBtnClass(active?: boolean) {
  return active ? 'active' : ''
}

export function yearFilterTriggerClass(active?: boolean) {
  return active ? 'border-primary bg-primary text-white' : ''
}

export const yearFilterPanelClass = 'records-custom-range year-filter-panel'

export const openingBalancePageHintClass = 'mb-[0.85rem] text-[0.78rem] leading-[1.5] text-muted'
