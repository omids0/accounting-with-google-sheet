import { formTriggerBase } from './formControlStyles'
import { cn } from '../../utils/cn'

export const pickerSheetPanelClass = 'max-h-[min(90vh,680px)]'

export const pickerSheetFooterClass = '[&>button]:!w-auto'

export const wheelPickerClass = cn(
  'relative w-full overflow-hidden rounded-[calc(var(--radius-sm))] border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_65%,transparent)]',
  'before:pointer-events-none before:absolute before:inset-x-[0.35rem] before:top-1/2 before:z-[1] before:h-[var(--wheel-item-height)] before:-translate-y-1/2 before:rounded-[calc(var(--radius-sm)-2px)] before:border before:border-[color-mix(in_srgb,var(--color-primary)_32%,var(--color-border))] before:bg-[color-mix(in_srgb,var(--color-primary)_11%,var(--color-surface))] before:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_10px_color-mix(in_srgb,var(--color-primary)_8%,transparent)] before:content-[""]'
)

export const wheelPickerScrollClass =
  'relative z-[2] h-full overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y [-ms-overflow-style:none] [scrollbar-width:none] snap-y snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden'

export const wheelPickerFadeClass =
  'pointer-events-none absolute inset-x-0 z-[3] h-[calc(var(--wheel-item-height)*2)]'

export const wheelPickerFadeTopClass = cn(
  wheelPickerFadeClass,
  'top-0 [background:linear-gradient(to_bottom,color-mix(in_srgb,var(--color-surface)_94%,transparent)_0%,transparent_100%)]'
)

export const wheelPickerFadeBottomClass = cn(
  wheelPickerFadeClass,
  'bottom-0 [background:linear-gradient(to_top,color-mix(in_srgb,var(--color-surface)_94%,transparent)_0%,transparent_100%)]'
)

export const wheelPickerItemClass = cn(
  'relative z-[2] flex w-full cursor-pointer items-center justify-center border-none bg-transparent p-0 font-[var(--font-numeric,var(--font))] text-[0.95rem] font-medium leading-none text-muted shadow-none outline-none will-change-[transform,opacity] snap-center snap-always whitespace-nowrap [transform-origin:center]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]'
)

export function wheelPickerItemSelectedClass(selected?: boolean) {
  return cn(selected && 'text-primary-dark')
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
    empty && 'font-medium text-muted',
    'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[var(--form-input-focus-shadow)]'
  )
}

export const jalaliDatePickerPreviewClass =
  'm-0 mt-1 text-[1.05rem] font-extrabold tracking-[-0.01em] text-primary-dark'

export const jalaliDatePickerTodayBtnClass = cn(
  'inline-flex min-h-touch-min w-full cursor-pointer items-center justify-center rounded-sm border border-[color-mix(in_srgb,var(--color-primary)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))] px-3 py-2 font-[inherit] text-[0.84rem] font-bold text-primary-dark transition-[background,border-color] duration-[var(--duration-fast)]',
  'hover:enabled:border-primary-light hover:enabled:bg-accent-soft',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] focus-visible:ring-offset-2'
)

export const pickerQuickActionsClass = 'flex w-full flex-col gap-2'

export const pickerConfirmActionsClass = cn(
  'mt-2.5 flex w-full flex-col gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] pt-2.5',
  '[&_button]:!w-full [&_button]:min-h-[2.65rem] [&_button]:px-4 [&_button]:text-[0.88rem]'
)

export const jalaliDatePickerActionsClass = pickerConfirmActionsClass

export const jalaliDatePickerPanelClass = cn(
  'mt-2 overflow-hidden rounded-[calc(var(--radius)+2px)] border border-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))] p-2.5',
  'bg-[color-mix(in_srgb,var(--color-surface)_78%,transparent)] backdrop-blur-xl',
  'shadow-[0_12px_34px_color-mix(in_srgb,var(--color-primary)_11%,transparent),inset_0_1px_0_rgba(255,255,255,0.28)]'
)

export const jalaliDatePickerClass =
  'grid w-full grid-cols-[0.95fr_1.55fr_1fr] gap-2.5 border-none bg-transparent p-0 shadow-none'

export const jalaliDatePickerColumnClass = cn(
  'flex min-w-0 flex-col items-center rounded-[calc(var(--radius-sm)+1px)] px-[0.25rem] pb-[0.2rem] pt-[0.4rem]',
  'border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]',
  'bg-[color-mix(in_srgb,var(--color-surface)_52%,transparent)] backdrop-blur-md',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
)

export const jalaliDatePickerMonthColumnClass =
  'min-w-0 [&_button]:whitespace-nowrap [&_button]:text-[0.82rem]'

export const jalaliDatePickerLabelClass =
  'mb-1 text-[0.72rem] font-bold tracking-[0.02em] text-primary-dark'

export const jalaliDateTimePickerClass = cn(
  jalaliDatePickerClass,
  'min-w-[min(100%,22rem)] grid-cols-[auto_0.95fr_1.55fr_1fr] items-stretch gap-2'
)

export const jalaliDateTimePickerSheetClass = cn(
  'grid-cols-3 grid-rows-[auto_auto] gap-3',
  '[&>.jalali-datetime-time-group]:col-span-3'
)

export const jalaliDateTimePickerTimeGroupClass = cn(
  'jalali-datetime-time-group flex shrink-0 flex-col gap-[0.35rem] rounded-[calc(var(--radius-sm)+1px)] p-[0.45rem]',
  'border border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]',
  'bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))] backdrop-blur-md',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
)

export const jalaliDateTimePickerTimeLabelsClass =
  'grid grid-cols-[1fr_auto_1fr] items-center gap-[0.15rem] text-center [&_.jalali-date-picker-label]:mb-0'

export const jalaliDateTimePickerTimeWheelsClass = 'flex items-center justify-center gap-[0.2rem]'

export const jalaliDateTimePickerTimeColumnClass = cn(
  'w-[3.25rem] min-w-[3.25rem] border-none bg-transparent p-0 shadow-none backdrop-blur-none'
)

export const jalaliDateTimePickerColonSpacerClass = 'w-[0.55rem] shrink-0'

export const jalaliDateTimePickerColonClass =
  'flex h-[calc(var(--wheel-item-height)*5)] w-[0.55rem] shrink-0 items-center justify-center text-[1.2rem] font-bold leading-none text-primary select-none'

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
