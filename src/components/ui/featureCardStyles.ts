import { cardClassName } from './Card'
import { cn } from '../../utils/cn'

/** Inner padding for list cards (installments, wallet, receivables, dang, checks). Tailwind p-2 = 0.5rem. */
export const listCardInsetClass = 'p-2'

export const listPageStackClass = 'flex flex-col gap-3 [&_.list-card]:mb-0'

export const interactiveCardClass = cn(
  'transition-[box-shadow,border-color,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
  'hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] hover:shadow-[var(--shadow),0_6px_20px_color-mix(in_srgb,var(--color-primary)_12%,transparent)] active:translate-y-0'
)

export function installmentCardClass({
  expanded,
  complete,
  className
}: {
  expanded?: boolean
  complete?: boolean
  className?: string
}) {
  return cardClassName(
    cn(
      interactiveCardClass,
      'list-card relative overflow-hidden p-0 [content-visibility:auto] [contain-intrinsic-size:auto_6.5rem]',
      'rounded-[calc(var(--radius)+2px)] transition-[box-shadow,border-color,transform] duration-[var(--duration-slow)] ease-[var(--ease-out)]',
      'before:absolute before:top-0 before:bottom-0 before:right-0 before:w-[3px] before:rounded-r-[3px]',
      'before:[background:linear-gradient(180deg,var(--color-primary-light)_0%,var(--color-primary)_100%)] before:opacity-0 before:transition-opacity before:duration-[var(--duration-fast)] before:ease-[var(--ease-out)] before:content-[""]',
      (expanded || complete) && 'before:opacity-100',
      expanded &&
        'border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] shadow-[var(--shadow-lg),0_6px_22px_color-mix(in_srgb,var(--color-primary)_14%,transparent)] -translate-y-0.5',
      expanded &&
        'hover:shadow-[var(--shadow-lg),0_8px_26px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]',
      complete && 'opacity-55 [&_.installment-header]:text-muted',
      className
    )
  )
}

export function receivableCompleteCardClass(complete?: boolean) {
  return complete ? 'opacity-55 [&_.installment-header]:text-muted' : ''
}

export function installmentHeaderClass(expanded?: boolean) {
  return cn(
    'installment-header flex w-full cursor-pointer items-start justify-between gap-1.5 rounded-sm border-none bg-transparent text-right text-inherit transition-[background] duration-[var(--duration-fast)]',
    listCardInsetClass,
    'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_55%,transparent)]',
    '[&>div:first-child]:min-w-0 [&>div:first-child]:flex-1',
    expanded && '[&_.installment-chevron]:rotate-180 [&_.installment-chevron]:text-primary'
  )
}

export const installmentChevronClass =
  'mt-[0.15rem] inline-flex shrink-0 text-[0.75rem] text-muted transition-[transform,color] duration-[var(--duration-slow)] ease-[var(--ease-out)]'

export const listCardTitleClass =
  'list-card-title text-[0.88rem] font-bold leading-[1.3] tracking-[-0.015em] text-text'

export const listCardSubtitleClass =
  'list-card-subtitle mt-[0.12rem] text-[0.72rem] leading-[1.35] text-muted'

export const listCardAmountPillClass = cn(
  'list-card-amount-pill inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-accent-mid))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-accent-soft)_90%,var(--color-surface)),var(--color-accent-soft))] px-[0.48rem] py-[0.14rem] text-[0.78rem] font-extrabold tracking-[0.01em] text-primary-dark tabular-nums font-numeric shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]'
)

export const cardHeaderWithEditClass = cn(
  'card-header-with-edit flex items-start',
  '[&_.installment-header]:min-w-0 [&_.installment-header]:flex-1'
)

export const cardActionButtonsClass = cn(
  'card-action-buttons flex shrink-0 flex-col items-center justify-center gap-[0.2rem]',
  'rounded-[calc(var(--radius-sm)-2px)] border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_45%,transparent)] p-[0.2rem]',
  '[&_.card-action-btn]:h-touch-min [&_.card-action-btn]:w-touch-min [&_.card-action-btn]:rounded-md',
  '[.card-header-with-edit_&]:m-2 [.card-header-with-edit_&]:ms-0 [.card-header-with-edit_&]:mt-2 [.card-header-with-edit_&]:self-start',
  '[.dang-card_&]:m-2 [.dang-card_&]:self-start',
  '[.wallet-item-card_&]:m-2 [.wallet-item-card_&]:ms-0 [.wallet-item-card_&]:mt-2 [.wallet-item-card_&]:self-start'
)

export const cardActionBtnClass = cn(
  'inline-flex h-touch-min w-touch-min shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-muted transition-[background,color] duration-[var(--duration-fast)]',
  'hover:enabled:bg-bg disabled:cursor-not-allowed disabled:opacity-45'
)

export const cardEditBtnClass = 'hover:enabled:text-primary'

export const cardDeleteBtnClass = 'hover:enabled:text-danger'

export function cardExpandBtnClass(expanded?: boolean) {
  return cn(
    'text-muted hover:enabled:text-primary [&_svg]:transition-transform [&_svg]:duration-[var(--duration-slow)] [&_svg]:ease-[var(--ease-out)]',
    expanded &&
      'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary [&_svg]:rotate-180'
  )
}

export const confirmDeleteMessageClass = 'm-0 text-[0.95rem] leading-[1.7] text-text'

export const cardInlineEditClass =
  'flex items-end gap-2 rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] p-[0.5rem_0.55rem] shadow-[var(--form-input-shadow)]'

export const cardInlineEditFieldClass = 'min-w-0 flex-1'

export const cardInlineEditLabelClass =
  'mb-[0.38rem] block text-[0.72rem] font-bold text-[var(--form-label-color)]'

export const cardInlineEditSpinnerClass = 'mb-[0.55rem] shrink-0'

export const installmentPaymentsClass = cn(
  'border-t border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] px-2 pb-2 pt-1.5',
  '[background:linear-gradient(180deg,color-mix(in_srgb,var(--color-accent-soft)_70%,transparent)_0%,transparent_100%)]',
  '[&>.installment-amount-summary]:mb-[0.65rem] [&>.installment-amount-summary]:mt-0'
)

export const installmentNoteClass =
  'installment-note my-2 rounded-sm border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-[0.7rem] py-[0.55rem] text-[0.78rem] leading-[1.55] text-text'

export function installmentPaymentItemClass({
  expanded,
  paid
}: {
  expanded?: boolean
  paid?: boolean
}) {
  return cn(
    'rounded-sm border-b border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] transition-[background,border-color,box-shadow] duration-[var(--duration-fast)] last:mb-0 last:border-b-0',
    expanded &&
      'mb-[0.35rem] border-[var(--form-input-border)] bg-[var(--form-input-bg)] shadow-[var(--form-input-shadow)] last:border-b last:border-[var(--form-input-border)]',
    paid &&
      'opacity-60 [&_.installment-payment-info>span:first-child]:text-muted [&_.installment-payment-info>span:first-child]:line-through [&_.installment-payment-amount-display]:text-muted [&_.installment-paid-at]:text-muted'
  )
}

export const installmentPaymentRowClass = cn(
  'flex items-center gap-2 rounded-sm px-[0.2rem] py-[0.45rem] transition-[background,padding-inline] duration-[var(--duration-fast)]',
  'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_45%,transparent)] hover:px-[0.55rem]',
  '[.installment-payment-item--expanded_&]:bg-transparent [.installment-payment-item--expanded_&]:px-[0.55rem]',
  '[&_input[type=checkbox]]:h-[1.35rem] [&_input[type=checkbox]]:w-[1.35rem] [&_input[type=checkbox]]:shrink-0 [&_input[type=checkbox]]:cursor-pointer [&_input[type=checkbox]]:rounded [&_input[type=checkbox]]:accent-primary'
)

export const installmentPaymentHeaderClass =
  'flex min-w-0 flex-1 cursor-pointer items-center gap-[0.45rem] border-none bg-transparent p-0 text-right font-[inherit] text-inherit'

export const installmentPaymentInfoClass = 'flex flex-1 flex-col gap-[0.15rem] text-[0.85rem]'

export const installmentDueClass = 'text-[0.75rem] text-muted'

export const installmentPaidAtClass = 'text-[0.75rem] text-success'

export const installmentPaymentAmountDisplayClass = cn(
  listCardAmountPillClass,
  'text-[0.82rem] px-[0.5rem] py-[0.18rem]'
)

export function installmentPaymentChevronClass(expanded?: boolean) {
  return cn(
    'shrink-0 text-muted transition-[transform,color] duration-[var(--duration-fast)]',
    expanded && 'rotate-180 text-primary'
  )
}

export const installmentPaymentEditClass = 'px-[0.45rem] pb-[0.55rem] pt-[0.3rem]'

export const installmentAmountSummaryClass = cn(
  'mt-[0.4rem] flex flex-col gap-[0.32rem] rounded-[calc(var(--radius-sm)+2px)] border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_88%,var(--color-accent-soft))] px-[0.55rem] py-[0.48rem]'
)

export const installmentAmountRowClass =
  'flex items-center justify-between gap-[0.65rem] [&+&]:border-t [&+&]:border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] [&+&]:pt-[0.4rem] [&_.money-display]:shrink-0 [&_.money-display]:text-left'

export const installmentAmountSummaryLabelClass =
  'shrink-0 text-[0.72rem] leading-[1.35] text-muted'

export const installmentDueLineClass = cn(
  listCardSubtitleClass,
  'mt-[0.22rem] flex items-center justify-between gap-[0.5rem] [&_.installment-due]:min-w-0 [&_.installment-due]:flex-1 [&_.installment-due]:leading-[1.4] [&_.money-display]:shrink-0'
)

export const installmentRangeLineClass = 'mb-[0.3rem] mt-[0.25rem]'

const listCardCheckboxShellBase = cn(
  interactiveCardClass,
  'list-card relative flex items-start gap-2 overflow-hidden p-0',
  listCardInsetClass
)

/** Checkbox row list cards (timesheet entries, dang, checks). Inner padding via listCardInsetClass. */
export function listCardCheckboxShellClass(className?: string) {
  return cardClassName(cn(listCardCheckboxShellBase, className))
}

export function dangCardClass({
  paid,
  expanded,
  className
}: {
  paid?: boolean
  expanded?: boolean
  className?: string
}) {
  return cardClassName(
    cn(
      listCardCheckboxShellBase,
      'dang-card cursor-pointer',
      'before:absolute before:top-0 before:bottom-0 before:right-0 before:w-[3px] before:opacity-55 before:content-[""]',
      'before:[background:linear-gradient(180deg,var(--color-expense)_0%,color-mix(in_srgb,var(--color-expense)_55%,var(--color-primary)_100%))]',
      'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_50%,transparent)]',
      paid &&
        'border-border opacity-[0.72] before:opacity-45 before:[background:linear-gradient(180deg,#94a3b8_0%,#cbd5e1_100%)]',
      expanded &&
        'border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] shadow-[var(--shadow-lg),0_6px_22px_color-mix(in_srgb,var(--color-primary)_14%,transparent)] -translate-y-0.5',
      className
    )
  )
}

export const dangCheckboxClass =
  'mt-[0.1rem] h-[1.35rem] w-[1.35rem] shrink-0 cursor-pointer rounded accent-primary'

export const dangCardBodyClass = 'min-w-0 flex-1'

export function dangCardTapAreaClass(expanded?: boolean) {
  return cn(
    'block w-full cursor-pointer rounded-sm border-none bg-transparent p-0 text-right text-inherit transition-[background] duration-[var(--duration-fast)]',
    'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_45%,transparent)]',
    expanded && 'bg-[color-mix(in_srgb,var(--color-accent-soft)_45%,transparent)]'
  )
}

export const dangCardHeaderClass = 'flex items-start justify-between gap-3'

export const dangCardTitleClass = 'text-[0.95rem] font-semibold [.dang-card.paid_&]:text-muted'

export const dangCardAmountClass = 'text-[0.9rem] font-bold tabular-nums text-primary-dark'

export const dangCardMetaClass = 'mt-[0.2rem] text-[0.76rem] leading-[1.4] text-muted'

export const dangCardDateClass = 'ms-1'

export const dangCardNoteClass = 'm-[0.28rem_0_0] text-[0.76rem] leading-[1.45] text-muted'

export const dangPaidAtClass = 'm-[0.5rem_0_0] text-[0.75rem] font-medium text-primary'

export const dangCardAmountEditClass = 'px-0 pb-[0.15rem] pt-[0.35rem]'

export const dangTotalFooterClass = cn(
  'mt-1 flex items-center justify-between bg-bg px-5 py-[0.85rem] text-center',
  '[&.stat-card_.stat-card__value-row--wide]:justify-center'
)

export const dangTotalLabelClass = 'text-[0.85rem] text-muted'

export const dangTotalValueClass = 'text-base font-bold text-primary-dark'

export const walletItemCardClass = 'wallet-item-card list-card p-0'

/** Shared list-card shell: zero outer padding; use installmentHeaderClass for inner inset. */
export const listCardShellClass = walletItemCardClass

export const walletItemInfoClass = 'min-w-0 flex-1'

export const walletItemTitleRowClass = 'flex items-center justify-between gap-2'

export const walletItemTitleClass =
  'min-w-0 text-[0.88rem] font-bold leading-[1.3] tracking-[-0.015em]'

export const walletItemNoteClass = 'mt-[0.28rem] text-[0.75rem] leading-[1.5] text-muted'

export const walletItemAmountPillClass = cn(
  'wallet-item-amount list-card-amount-pill',
  listCardAmountPillClass
)

export const walletItemAmountClass =
  'wallet-item-amount shrink-0 text-[0.92rem] font-extrabold tracking-[0.015em] text-primary-dark font-numeric tabular-nums'

export const walletItemEditClass = 'pt-[0.15rem]'
