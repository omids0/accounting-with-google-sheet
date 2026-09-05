import { formControlClassName } from './formStyles'
import { cn } from '../../utils/cn'

export const formTriggerBase = cn(
  formControlClassName(),
  'appearance-none cursor-pointer px-[0.9rem] py-[0.72rem] text-right font-[inherit] leading-[1.4]'
)

export function customSelectRootClass({ open, className }: { open?: boolean; className?: string }) {
  return cn('relative w-full', open && 'z-20', className)
}

export const customSelectTriggerClass = cn(
  'flex w-full items-center justify-between gap-2 px-[0.9rem] py-[0.72rem] text-right font-[inherit] leading-[1.4]',
  formTriggerBase
)

export function customSelectTriggerStateClass({
  open,
  compact,
  disabled
}: {
  open?: boolean
  compact?: boolean
  disabled?: boolean
}) {
  return cn(
    compact && 'rounded-form px-[0.55rem] py-[0.65rem] text-[0.9rem]',
    open && 'border-primary shadow-[var(--form-input-focus-shadow)]',
    disabled && 'cursor-not-allowed opacity-60',
    'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[var(--form-input-focus-shadow)]'
  )
}

export const customSelectValueClass = 'min-w-0 flex-1'

export function customSelectChevronClass(open?: boolean) {
  return cn(
    'h-3 w-3 shrink-0 text-primary transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)]',
    open && 'rotate-180'
  )
}

export const customSelectMenuClass = cn(
  'absolute inset-x-0 top-[calc(100%+4px)] z-50 m-0 max-h-60 list-none overflow-y-auto rounded-sm border-[1.5px] border-border bg-surface p-[0.35rem] shadow-[var(--shadow)]',
  'animate-[slideDown_var(--duration-normal)_var(--ease-out)]'
)

export function customSelectOptionClass({
  selected,
  disabled
}: {
  selected?: boolean
  disabled?: boolean
}) {
  return cn(
    'w-full cursor-pointer rounded-lg px-3 py-[0.6rem] text-[0.95rem] leading-[1.4] transition-[background-color,color] duration-[var(--duration-fast)]',
    selected ? 'bg-primary text-white hover:bg-primary-dark' : 'hover:bg-[rgba(15,118,110,0.1)]',
    disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent'
  )
}

export function categorySelectRootClass({
  open,
  saving
}: {
  open?: boolean
  disabled?: boolean
  saving?: boolean
}) {
  return cn(customSelectRootClass({ open }), open && 'z-40', saving && '[&_button]:opacity-80')
}

export const categorySelectTriggerClass = 'gap-[0.55rem]'

export const categorySelectLeadingClass =
  'inline-flex shrink-0 items-center justify-center text-primary opacity-85'

export const categorySelectPlaceholderClass = 'font-normal text-muted'

export const categorySelectSpinnerClass = 'h-4 w-4 shrink-0'

export const categorySelectSheetPanelClass = 'max-h-[min(88vh,640px)]'

export const categorySelectPanelClass = 'flex min-h-0 flex-1 flex-col overflow-hidden'

export const categorySelectHeaderClass = cn(
  'flex items-center justify-between gap-2 border-b border-border px-3 py-[0.65rem]',
  '[background:linear-gradient(180deg,var(--color-accent-soft)_0%,var(--color-surface)_100%)]'
)

export const categorySelectHeaderTitleClass =
  'flex items-center gap-[0.45rem] text-[0.82rem] font-bold text-text'

export const categorySelectCountClass =
  'inline-flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-primary px-[0.35rem] text-[0.68rem] font-bold text-white'

export function categorySelectManageBtnClass(active?: boolean) {
  return cn(
    'inline-flex cursor-pointer items-center gap-[0.3rem] rounded-full border border-border bg-surface px-[0.6rem] py-[0.35rem] font-[inherit] text-[0.72rem] font-semibold text-muted transition-[background,color,border-color] duration-[var(--duration-fast)]',
    'hover:enabled:border-primary-light hover:enabled:text-primary-dark',
    active && 'border-primary bg-primary text-white'
  )
}

export const categorySelectSearchClass =
  'flex items-center gap-[0.45rem] border-b border-border px-3 py-[0.55rem] text-muted'

export const categorySelectSearchInputClass =
  'min-w-0 flex-1 border-none bg-transparent p-0 font-[inherit] text-[0.88rem] text-text outline-none placeholder:text-muted'

export const categorySelectSearchClearClass =
  'inline-flex h-touch-min w-touch-min shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-bg p-0 text-muted'

export const categorySelectAddClass = 'border-b border-border bg-bg px-3 py-[0.6rem]'

export const categorySelectAddRowClass = 'flex items-center gap-[0.4rem]'

export const categorySelectAddInputClass = cn(
  'min-w-0 flex-1 rounded-sm px-[0.7rem] py-[0.55rem] text-[0.88rem]',
  formControlClassName()
)

export const categorySelectAddBtnClass = cn(
  'inline-flex h-touch-min w-touch-min shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-primary p-0 text-white transition-[background,transform] duration-[var(--duration-fast)]',
  'hover:enabled:bg-primary-dark active:enabled:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2'
)

export const categorySelectListClass =
  'm-0 min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-1 [-webkit-overflow-scrolling:touch]'

export function categorySelectItemClass({
  selected,
  editing,
  confirming
}: {
  selected?: boolean
  editing?: boolean
  confirming?: boolean
}) {
  return cn(
    'mb-1 flex items-center gap-1 rounded-sm transition-[background] duration-[var(--duration-fast)] last:mb-0',
    selected && !editing && !confirming && 'bg-[rgba(15,118,110,0.08)]',
    !editing && !confirming && 'hover:bg-bg'
  )
}

export const categorySelectOptionBtnClass = cn(
  'flex min-h-touch-min min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm border-none bg-transparent px-3 py-2 text-right font-[inherit] text-[0.92rem] text-text transition-[color,background-color] duration-[var(--duration-fast)]',
  'hover:enabled:bg-[rgba(15,118,110,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] disabled:cursor-default'
)

export const categorySelectOptionCheckClass =
  'inline-flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center text-primary'

export function categorySelectOptionLabelClass(selected?: boolean) {
  return cn(
    'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap',
    selected && 'font-semibold text-primary-dark'
  )
}

export const categorySelectActionsClass = 'flex shrink-0 gap-[0.15rem] pl-1'

export function categorySelectIconBtnClass(variant?: 'save' | 'danger') {
  return cn(
    'inline-flex h-touch-min w-touch-min cursor-pointer items-center justify-center rounded-lg border-none bg-transparent p-0 leading-none text-muted transition-[background,color] duration-[var(--duration-fast)]',
    'hover:enabled:bg-accent-soft hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40',
    variant === 'save' && 'hover:enabled:bg-[var(--color-success-bg)] hover:enabled:text-success',
    variant === 'danger' && 'hover:enabled:bg-[var(--color-danger-bg)] hover:enabled:text-danger'
  )
}

export const categorySelectEditClass = 'flex min-w-0 flex-1 items-center gap-1 p-1'

export const categorySelectEditInputClass = cn(
  'min-w-0 flex-1 rounded-sm px-[0.65rem] py-2 text-[0.88rem]',
  formControlClassName()
)

export const categorySelectConfirmClass =
  'flex min-w-0 flex-1 flex-col gap-[0.45rem] px-[0.55rem] py-2 text-[0.82rem] text-danger'

export const categorySelectConfirmActionsClass = 'flex gap-[0.35rem]'

export const categorySelectConfirmBtnClass =
  'cursor-pointer rounded-full border border-border bg-surface px-[0.65rem] py-[0.35rem] font-[inherit] text-[0.75rem] font-semibold text-text'

export const categorySelectConfirmDangerBtnClass = cn(
  categorySelectConfirmBtnClass,
  'border-danger bg-danger text-white'
)

export const categorySelectEmptyClass = 'px-3 py-5 text-center text-[0.85rem] text-muted'

export const categorySelectFooterClass =
  'border-t border-border bg-bg px-2 pb-[0.55rem] pt-[0.45rem]'

export const categorySelectFooterBtnClass = cn(
  'inline-flex min-h-touch-min w-full cursor-pointer items-center justify-center gap-[0.35rem] rounded-sm border border-border bg-surface px-[0.65rem] py-2 font-[inherit] text-[0.84rem] font-semibold text-primary-dark transition-[background,border-color] duration-[var(--duration-fast)]',
  'hover:enabled:border-primary-light hover:enabled:bg-accent-soft',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] focus-visible:ring-offset-2'
)

export const amountFieldClass = 'flex flex-col gap-[0.45rem]'

export const amountFieldCompactClass = 'w-full'

export const amountFieldInputWrapClass = cn(
  'flex items-stretch overflow-hidden rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] shadow-[var(--form-input-shadow)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'focus-within:border-primary focus-within:shadow-[var(--form-input-focus-shadow)]'
)

export const amountFieldInputWrapCompactClass = 'min-h-touch-min'

export const amountFieldInputClass = cn(
  'min-h-touch-min min-w-0 flex-1 border-none! bg-transparent! px-[0.9rem] py-[0.72rem] text-[1.05rem] font-bold tracking-[0.02em] shadow-none! outline-none'
)

export const amountFieldInputCompactClass = cn(
  amountFieldInputClass,
  'min-h-0 px-[0.65rem] py-[0.55rem] text-[0.92rem] text-left tabular-nums'
)

export const amountFieldCurrencyClass =
  'inline-flex items-center whitespace-nowrap border-s border-border bg-accent-soft px-[0.85rem] text-[0.78rem] font-bold text-primary-dark'

export const amountFieldCurrencyCompactClass = 'px-[0.55rem] text-[0.68rem] font-bold'

export const amountFieldSubmitBtnClass = cn(
  'amount-field-submit inline-flex min-h-touch-min shrink-0 cursor-pointer items-center justify-center border-none px-[0.7rem] py-0',
  'border-s border-[color-mix(in_srgb,var(--color-primary-dark)_35%,rgba(255,255,255,0.35))]',
  'text-[0.72rem] font-extrabold tracking-[0.01em] text-white',
  '[background:linear-gradient(145deg,var(--color-primary-dark)_0%,var(--color-primary)_52%,var(--color-primary-light)_100%)]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]',
  'transition-[filter,transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
  'hover:enabled:brightness-105 active:enabled:scale-[0.96]',
  'focus-visible:outline-none focus-visible:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_0_3px_var(--color-focus-ring)]',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:[background:color-mix(in_srgb,var(--color-border)_70%,var(--color-surface))] disabled:text-muted disabled:shadow-none'
)

export const amountFieldSubmitBtnLabelClass = 'whitespace-nowrap leading-none'

export const amountWordsClass =
  'm-0 rounded-sm border border-dashed border-border bg-accent-soft px-[0.65rem] py-[0.45rem] text-[0.78rem] leading-[1.55] text-muted'

export const formGroupClass = 'mb-[var(--form-gap)]'

export const formFieldClass = formGroupClass

export const formFieldLabelClass =
  'mb-[0.42rem] flex items-center gap-1 text-[0.78rem] font-bold tracking-[0.01em] text-[var(--form-label-color)]'

export const formFieldLabelTextClass = 'leading-[1.3]'

export const formReadonlyValueClass = cn(
  'min-h-touch-min rounded-form border border-[var(--form-input-border)] bg-[var(--surface-muted,var(--form-input-bg))] px-[0.9rem] py-[0.72rem] font-semibold text-text'
)

export const formNoteTextareaClass = 'min-h-[5.5rem] resize-y leading-[1.55]'

export const unlockFormGroupClass = formGroupClass

export const unlockFormLabelClass = formFieldLabelClass
