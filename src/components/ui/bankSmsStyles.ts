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
