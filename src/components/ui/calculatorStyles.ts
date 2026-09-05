import { cn } from '../../utils/cn'

export const loanCalculatorPageClass = 'flex flex-col gap-4'

export const loanCalculatorHintClass = 'mb-3 text-[0.82rem] leading-[1.6] text-muted'

export const loanCalculatorFormulaHintClass = 'mb-3 text-[0.82rem] leading-[1.6] text-muted'

export const loanCalculatorResultCardClass = 'text-center'

export const loanCalculatorSummaryCardTitleClass = 'mb-3'

export const loanCalculatorSummaryGridClass = 'flex flex-col gap-[0.85rem]'

export const loanCalculatorSummaryItemClass =
  'flex items-center justify-between gap-4 border-b border-border py-[0.65rem] last:border-b-0'

export const loanCalculatorSummaryItemTotalClass = cn(
  loanCalculatorSummaryItemClass,
  'mt-[0.15rem] border-t-2 border-t-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] pt-[0.85rem]'
)

export const loanCalculatorSummaryLabelClass = 'text-[0.88rem] font-semibold text-muted'

export const loanCalculatorEmptyCardClass = 'text-center'

export const loanRateInputWrapClass = cn(
  'flex w-full items-stretch overflow-hidden rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] shadow-[var(--form-input-shadow)]',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'focus-within:border-primary focus-within:shadow-[var(--form-input-focus-shadow)]',
  '[&_input]:min-w-0 [&_input]:flex-1 [&_input]:w-auto [&_input]:border-none [&_input]:bg-transparent [&_input]:px-[0.85rem] [&_input]:py-[0.7rem] [&_input]:shadow-none',
  '[&_input:focus]:border-none [&_input:focus]:bg-transparent [&_input:focus]:shadow-none [&_input:focus]:outline-none'
)

export const loanRateSuffixClass = cn(
  'flex flex-shrink-0 items-center justify-center bg-accent-soft px-[0.85rem] font-semibold text-muted'
)

export const currencyConverterPageClass = 'flex flex-col gap-4'

export const currencyConverterFormCardClass = 'relative z-[2] overflow-visible'

export const currencyConverterHeaderClass =
  'mb-2 flex items-center justify-between gap-3 [&_.card-title]:m-0'

export const currencyConverterHeaderBtnClass =
  'inline-flex w-auto items-center gap-[0.35rem] whitespace-nowrap'

export const currencyConverterHintClass = 'mb-3 text-[0.82rem] leading-[1.6] text-muted'

export const currencyConverterSelectRowClass = cn(
  'relative z-[3] mb-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2',
  '[&_[data-open]]:z-30',
  'max-[520px]:grid-cols-1 max-[520px]:items-stretch'
)

export const currencyConverterSwapBtnClass = cn(
  'mb-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary',
  'transition-[background,transform] duration-[var(--duration-fast)]',
  'hover:[background:color-mix(in_srgb,var(--color-primary)_14%,transparent)] hover:scale-[1.04]',
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]',
  'max-[520px]:mx-auto max-[520px]:mb-2 max-[520px]:rotate-90 max-[520px]:hover:rotate-90 max-[520px]:hover:scale-[1.04]'
)

export const currencyConverterRateLineClass = 'mb-3 text-[0.82rem] leading-[1.6] text-muted'

export const currencyConverterUpdatedAtClass = 'mb-3 text-[0.82rem] leading-[1.6] text-muted'

export const currencyConverterResultCardClass = 'relative z-[1] text-center'

export const currencyConverterResultValueClass =
  'text-[clamp(1.5rem,5vw,2rem)] font-extrabold leading-[1.35] text-[var(--color-primary-dark)]'

export const currencyConverterEmptyCardClass = 'relative z-[1] text-center'

export const dateCalculatorPageClass =
  'flex flex-col gap-[0.6rem] [&>.card]:mb-0 [&>.card]:px-[0.9rem] [&>.card]:py-[0.85rem]'

export const dateCalculatorFormCardClass = 'relative z-[2] [&_.jalali-date-picker-wrap]:w-full'

export const dateCalculatorCardTitleClass = 'mb-[0.6rem] text-[0.95rem]'

export const dateCalculatorConversionsCardClass = 'py-3'

export const dateCalculatorConversionsHeadClass = 'mb-[0.45rem] text-[0.78rem] font-bold text-muted'

export const dateCalculatorConversionListClass = 'm-0 list-none p-0'

export const dateCalculatorConversionItemClass = cn(
  'grid grid-cols-[4.25rem_minmax(0,1fr)] items-start gap-[0.55rem] border-b border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] py-2',
  'first:pt-0 last:border-b-0 last:pb-0'
)

export function dateCalculatorConversionItemSourceClass(isSource?: boolean) {
  return cn(
    dateCalculatorConversionItemClass,
    isSource &&
      '-mx-[0.35rem] rounded-sm border-b-transparent bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))] px-[0.35rem]'
  )
}

export const dateCalculatorConversionLabelClass =
  'flex flex-col items-start gap-[0.2rem] pt-[0.1rem] text-[0.78rem] font-bold text-[var(--color-primary-dark)]'

export const dateCalculatorConversionValueClass = 'flex min-w-0 flex-col gap-[0.2rem]'

export const dateCalculatorConversionNumericClass =
  'text-[0.9rem] font-bold leading-[1.4] text-[var(--color-primary-dark)]'

export const dateCalculatorConversionWordsClass =
  'text-[0.78rem] font-medium leading-[1.55] text-muted'

export const dateCalculatorSourceBadgeClass = cn(
  'rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] px-[0.4rem] py-[0.1rem]',
  'text-[0.62rem] font-bold leading-[1.3] text-primary'
)
