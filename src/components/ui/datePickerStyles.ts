import { formTriggerBase } from './formControlStyles'
import { cn } from '../../utils/cn'

export const wheelPickerClass =
  'relative w-full overflow-hidden border-none bg-transparent shadow-none'

export const wheelPickerScrollClass =
  'h-full overflow-x-hidden overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] snap-y snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden'

export const wheelPickerFadeClass =
  'pointer-events-none absolute inset-x-0 z-[2] h-[calc(var(--wheel-item-height)*2)]'

export const wheelPickerFadeTopClass = cn(
  wheelPickerFadeClass,
  'top-0 [background:linear-gradient(to_bottom,rgba(248,255,254,0.95)_0%,rgba(248,255,254,0)_100%)] [[data-theme=dark]_&]:[background:linear-gradient(to_bottom,rgba(21,42,40,0.95)_0%,rgba(21,42,40,0)_100%)]'
)

export const wheelPickerFadeBottomClass = cn(
  wheelPickerFadeClass,
  'bottom-0 [background:linear-gradient(to_top,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_100%)] [[data-theme=dark]_&]:[background:linear-gradient(to_top,rgba(21,42,40,0.95)_0%,rgba(21,42,40,0)_100%)]'
)

export const wheelPickerItemClass = cn(
  'flex w-full cursor-pointer items-center justify-center border-none bg-transparent p-0 font-[var(--font)] text-[0.88rem] font-normal leading-none text-muted shadow-none outline-none will-change-[transform,opacity] snap-center snap-always whitespace-nowrap [transform-origin:center]'
)

export function wheelPickerItemSelectedClass(selected?: boolean) {
  return cn(selected && 'font-bold text-primary-dark')
}

export const jalaliDatePickerWrapClass = 'w-full'

export const jalaliDatePickerWrapInlineClass = 'w-full'

export function jalaliDatePickerTriggerClass({
  active,
  empty
}: {
  active?: boolean
  empty?: boolean
}) {
  return cn(
    'w-full cursor-pointer px-[0.9rem] py-[0.72rem] text-right font-[inherit] leading-[1.4]',
    formTriggerBase,
    active && 'border-primary shadow-[var(--form-input-focus-shadow)]',
    empty && 'font-medium text-muted'
  )
}

export const jalaliDatePickerPanelClass = 'mt-2'

export const jalaliDatePickerActionsClass = 'mt-2 border-t-0 pt-0'

export const jalaliDatePickerClass =
  'grid grid-cols-[1fr_1.5fr_0.85fr] gap-[0.35rem] border-none bg-transparent p-0 shadow-none'

export const jalaliDatePickerColumnClass = 'flex min-w-0 flex-col items-center'

export const jalaliDatePickerMonthColumnClass =
  'min-w-0 flex-[1.45] [&_button]:whitespace-nowrap [&_button]:text-[0.78rem]'

export const jalaliDatePickerLabelClass =
  'mb-[0.15rem] text-[0.68rem] font-semibold uppercase tracking-[0.02em] text-muted'

export const jalaliDateTimePickerClass = cn(
  jalaliDatePickerClass,
  'min-w-[min(100%,22rem)] grid-cols-[auto_1fr_1.5fr_0.85fr] items-end'
)

export const jalaliDateTimePickerTimeGroupClass =
  'ms-[0.2rem] flex shrink-0 flex-row items-end gap-[0.1rem] rounded-sm border border-border bg-accent-soft px-[0.35rem] pt-[0.2rem]'

export const jalaliDateTimePickerTimeColumnClass = 'w-[2.75rem] min-w-[2.75rem]'

export const jalaliDateTimePickerColonClass =
  'flex h-[calc(var(--wheel-item-height)*5)] shrink-0 items-center justify-center text-[1.1rem] font-bold leading-none text-primary-dark select-none'

export const jalaliDateTimePickerFieldLabelClass =
  'mb-[0.42rem] block text-[0.78rem] font-bold text-[var(--form-label-color)]'

export const accordionCollapseClass =
  'grid grid-rows-[0fr] transition-[grid-template-rows] duration-[var(--duration-slow)] ease-[var(--ease-out)]'

export const accordionCollapseOpenClass = 'grid-rows-[1fr]'

export const accordionCollapseInnerClass = 'min-h-0 overflow-hidden'

export const accordionCollapsePaymentsOpenClass =
  '[&>.installment-payments]:translate-y-0 [&>.installment-payments]:opacity-100'

export const accordionCollapsePaymentsClass =
  '[&>.installment-payments]:translate-y-[-6px] [&>.installment-payments]:opacity-0 [&>.installment-payments]:transition-[opacity,transform] [&>.installment-payments]:duration-[var(--duration-slow)] [&>.installment-payments]:ease-[var(--ease-out)]'
