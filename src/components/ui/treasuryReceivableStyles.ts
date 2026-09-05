import { interactiveCardClass } from './featureCardStyles'
import { cn } from '../../utils/cn'

export const receivableSummaryClass =
  'my-3 grid grid-cols-3 gap-2 rounded-lg bg-bg p-3 text-[0.8rem] [&>div]:flex [&>div]:flex-col [&>div]:gap-[0.2rem]'

export const receivableSummaryLabelClass = 'text-[0.7rem] text-muted'

export const receivablePaidClass = 'font-semibold text-success'

export const receivableRemainingClass = 'font-semibold text-primary-dark'

export const receivableSettledClass = 'font-semibold text-muted'

export const receivablePaymentListClass = 'mt-2'

export const receivablePaymentListTitleClass = 'mb-2 text-[0.75rem] text-muted'

export const receivablePaymentItemClass = cn(
  'flex items-start gap-3 border-b border-border py-2 text-[0.85rem] last:border-b-0',
  '[&_input[type=checkbox]]:mt-[0.15rem] [&_input[type=checkbox]]:h-[1.1rem] [&_input[type=checkbox]]:w-[1.1rem] [&_input[type=checkbox]]:shrink-0 [&_input[type=checkbox]]:accent-primary',
  '[&>div]:flex [&>div]:flex-col [&>div]:gap-[0.15rem]'
)

export const receivableAddPaymentClass = 'mt-3 border-t border-border pt-3'

export const receivableAddPaymentActionsClass = 'flex flex-wrap gap-2'

export const receivablePaymentFormClass =
  'rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] p-3 shadow-[var(--form-input-shadow)]'

export const receivableTotalCardClass = cn(
  'p-4 text-center transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)]',
  '[&.stat-card_.stat-card__value-row--wide]:justify-center'
)

export const receivableTotalLabelClass = 'mb-[0.35rem] text-[0.8rem] text-muted'

export const receivableTotalAmountClass =
  'text-[1.35rem] font-extrabold tracking-[0.02em] text-primary-dark'

export const treasuryPriceCardClass = 'px-4 py-[0.85rem]'

export const treasuryPriceHeaderClass = 'mb-[0.65rem] flex items-center justify-between'

export const treasuryPriceTitleClass = 'text-[0.8rem] text-muted'

export const treasuryPriceGridClass = 'grid grid-cols-1 gap-[0.4rem]'

export const treasuryPriceItemClass =
  'flex items-center justify-between border-b border-border py-[0.35rem] text-[0.8rem] last:border-b-0'

export const treasuryActionToggleClass =
  'mb-4 flex gap-2 [&_button]:flex-1 [&_button]:rounded-lg [&_button]:border [&_button]:border-border [&_button]:bg-bg [&_button]:p-[0.6rem] [&_button]:text-[0.85rem] [&_button]:font-semibold [&_button]:text-muted [&_button.active.buy]:border-danger [&_button.active.buy]:bg-[var(--color-danger-bg)] [&_button.active.buy]:text-danger [&_button.active.sell]:border-danger [&_button.active.sell]:bg-[var(--color-danger-bg)] [&_button.active.sell]:text-danger'

export const treasuryHintClass = 'mt-[0.35rem] text-[0.75rem] text-muted'

export const treasuryHoldingValueClass =
  'mt-[0.35rem] text-[0.85rem] font-semibold text-primary-dark'

export const treasuryHoldingCardClass = '[&_.installment-header]:items-start'

export const treasuryTxItemClass = 'border-b border-border py-[0.6rem] last:border-b-0'

export const treasuryTxMainClass = 'flex items-center gap-2 text-[0.85rem] font-semibold'

export function treasuryTxBadgeClass(type: 'buy' | 'sell') {
  return cn(
    'rounded-md px-[0.45rem] py-[0.15rem] text-[0.7rem] font-semibold',
    type === 'buy' && 'bg-[var(--color-danger-bg)] text-danger',
    type === 'sell' && 'bg-[var(--color-danger-bg)] text-danger'
  )
}

export const treasuryTxDetailsClass = 'mt-1 flex flex-col gap-[0.15rem] text-[0.8rem]'

export const treasuryTotalCardClass =
  '[background:linear-gradient(135deg,var(--color-bg)_0%,var(--color-accent-soft)_100%)]'

export const treasuryTxInteractiveClass = cn(
  interactiveCardClass,
  'relative -mx-3 rounded-sm px-3 py-[0.65rem] hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_55%,transparent)]'
)
