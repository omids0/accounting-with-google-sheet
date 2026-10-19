import type { SmsSlotRole } from '../../types'
import { cn } from '../../utils/cn'

export const smsSectionClass =
  'flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-bg p-3'

export const smsSectionHeaderClass = 'flex items-center justify-between gap-2'

export const smsSectionTitleClass = 'm-0 text-[0.88rem] font-bold text-primary-dark'

export const smsHintClass = 'm-0 text-[0.75rem] leading-[1.6] text-muted'

export const smsTemplateListClass = 'm-0 flex list-none flex-col gap-2 p-0'

export const smsTemplateItemClass =
  'flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[0.8rem]'

export const smsTemplateTextClass = 'min-w-0 truncate text-text'

export const smsTextareaClass =
  'min-h-[7rem] w-full resize-y rounded-[var(--radius-sm)] border border-border bg-surface p-2 text-[0.85rem] leading-[1.7]'

export const smsTokensClass =
  'flex flex-wrap items-center gap-x-1 gap-y-2 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface p-2 text-[0.82rem] leading-[1.9]'

const ROLE_CHIP_CLASS: Record<SmsSlotRole, string> = {
  amount:
    'border-[var(--color-expense-border)] bg-[var(--color-expense-bg)] text-[var(--color-expense)]',
  balance:
    'border-[var(--color-income-border)] bg-[var(--color-income-bg)] text-[var(--color-income)]',
  accountRef: 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-warning',
  ignore: 'border-border bg-bg text-muted line-through decoration-1'
}

export function smsRoleChipClass(role: SmsSlotRole) {
  return cn(
    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold [direction:ltr] transition-colors',
    ROLE_CHIP_CLASS[role]
  )
}

export const smsRoleChipLabelClass = 'text-[0.65rem] font-normal [direction:rtl]'

export const smsPreviewClass =
  'grid grid-cols-2 gap-x-3 gap-y-1 rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] p-2 text-[0.78rem]'

export const smsPreviewLabelClass = 'text-muted'

export const smsActionsRowClass = 'flex flex-wrap items-center gap-2'

export const smsIssueListClass = 'm-0 list-disc ps-5 text-[0.75rem] text-danger'

export const smsInboxListClass =
  'm-0 flex max-h-[16rem] list-none flex-col gap-2 overflow-y-auto p-0'

export const smsInboxItemClass =
  'w-full rounded-[var(--radius-sm)] border border-border bg-surface p-2 text-start text-[0.78rem] leading-[1.6] hover:border-primary'

export const smsPageClass = 'flex flex-col gap-3'

export const smsCardClass = 'flex flex-col gap-3'

export const smsCardHeadClass = 'flex flex-wrap items-center justify-between gap-2'

export const smsCardTitleClass = 'm-0 text-[0.9rem] font-bold text-primary-dark'

export function smsAmountClass(direction: 'debit' | 'credit') {
  return cn(
    'text-[1rem] font-bold',
    direction === 'debit' ? 'text-[var(--color-expense)]' : 'text-[var(--color-income)]'
  )
}

export const smsMetaClass = 'm-0 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] text-muted'

export const smsRawClass = 'text-[0.75rem] leading-[1.7] text-muted [&>summary]:cursor-pointer'

export const smsBadgeClass =
  'rounded-full border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-2 py-0.5 text-[0.7rem] font-bold text-warning'

/* Round 6 review queue */

/** Queue cards sit inside a swipe row, which owns the spacing. */
export const smsQueueCardClass = 'mb-0 flex flex-col gap-2.5'

export const smsQueueListClass = 'flex flex-col gap-3'

export function smsBigAmountClass(direction: 'debit' | 'credit') {
  return cn(
    'text-[1.45rem] font-extrabold leading-tight tabular-nums',
    direction === 'debit' ? 'text-[var(--color-expense)]' : 'text-[var(--color-income)]'
  )
}

export const smsAmountRowClass = 'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'

export const smsAccountLineClass = 'text-[0.8rem] text-muted'

export const smsChoiceRowClass =
  'flex flex-col gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] px-3 py-2'

export const smsChoiceReasonClass = 'm-0 min-w-0 text-[0.72rem] leading-[1.6] text-muted'

export const smsRawTextClass =
  'm-0 whitespace-pre-line rounded-[var(--radius-sm)] bg-bg p-2 text-[0.75rem] leading-[1.7] text-muted'

export const smsStatusRowClass =
  'flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[0.85rem] font-bold text-primary-dark'

export const smsStatusRangeClass =
  'inline-flex min-h-touch-min items-center gap-1 rounded-full px-2 text-[0.78rem] font-normal text-muted hover:text-primary'

/**
 * Phones: fixed above the bottom nav (the document scrolls there, so sticky cannot hold);
 * tablet and desktop: sticky at the bottom of the scrolling main column.
 */
export const smsBulkBarClass = cn(
  'fixed bottom-[calc(6.25rem+var(--safe-bottom))] left-1/2 z-20 mb-0 w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2',
  'md:sticky md:bottom-3 md:left-auto md:w-auto md:max-w-none md:translate-x-0',
  'flex flex-wrap items-center justify-between gap-2 shadow-[var(--shadow-lg)]'
)

/** Room under the queue on phones, so the fixed bar never hides the last card. */
export const smsBulkBarSpacerClass = 'h-16 md:hidden'

export const smsAmountTokenClass =
  'inline-flex items-center gap-1 rounded-full border border-[var(--color-expense-border)] bg-[var(--color-expense-bg)] px-2 py-0.5 font-bold text-[var(--color-expense)] [direction:ltr] hover:brightness-95 disabled:opacity-50'

export const smsMenuListClass = 'm-0 flex list-none flex-col gap-1 p-0'

export const smsMenuItemClass =
  'flex min-h-touch-min w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 text-start text-[0.9rem] text-text hover:bg-[var(--color-accent-soft)] disabled:opacity-50'
