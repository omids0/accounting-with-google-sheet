import { cn } from '../../utils/cn'

export const fabContainerClass = cn(
  'pointer-events-none fixed bottom-[calc(5.75rem+var(--safe-bottom)+6px)] left-1/2 z-[25] flex w-full max-w-[480px] -translate-x-1/2 justify-start px-4',
  'min-[380px]:px-5'
)

export const speedDialContainerClass = 'z-[25]'

export const speedDialBackdropClass = cn(
  'fixed inset-0 z-[24] cursor-default border-none bg-[var(--color-overlay-light)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)] backdrop-blur-[4px]'
)

export const speedDialClass = 'relative flex flex-col items-start gap-4'

export const speedDialActionsClass = 'flex flex-col-reverse items-start gap-2.5'

export function speedDialActionWrapClass(open?: boolean) {
  return cn(
    'pointer-events-none flex items-center gap-2 opacity-0 [transform:translateY(8px)_scale(0.94)]',
    'transition-[opacity,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
    '[transition-delay:calc(var(--action-index)*40ms)]',
    open && 'pointer-events-auto translate-y-0 scale-100 opacity-100'
  )
}

const speedDialActionBaseClass = cn(
  'flex h-touch-min w-touch-min shrink-0 items-center justify-center rounded-full',
  'bg-surface text-primary-dark',
  'ring-1 ring-[color-mix(in_srgb,var(--color-border)_72%,var(--color-primary)_10%)]',
  'shadow-[0_2px_10px_color-mix(in_srgb,var(--color-primary)_7%,rgba(15,23,42,0.1))]',
  'transition-[transform,box-shadow,background,color] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
  'touch-manipulation hover:enabled:bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))]',
  'hover:enabled:shadow-[0_4px_14px_color-mix(in_srgb,var(--color-primary)_10%,rgba(15,23,42,0.12))]',
  'active:enabled:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-55',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]'
)

export const speedDialActionClass = speedDialActionBaseClass

export const speedDialActionIncomeClass = cn(
  speedDialActionBaseClass,
  'text-income ring-[color-mix(in_srgb,var(--color-income)_20%,var(--color-border))]',
  'hover:enabled:bg-[color-mix(in_srgb,var(--color-income)_6%,var(--color-surface))]'
)

export const speedDialActionExpenseClass = cn(
  speedDialActionBaseClass,
  'text-expense ring-[color-mix(in_srgb,var(--color-expense)_20%,var(--color-border))]',
  'hover:enabled:bg-[color-mix(in_srgb,var(--color-expense)_6%,var(--color-surface))]'
)

export const speedDialActionIconClass =
  'flex h-[1.125rem] w-[1.125rem] items-center justify-center leading-none [&_svg]:h-full [&_svg]:w-full'

export const speedDialActionLabelClass = cn(
  'max-w-[9.5rem] truncate rounded-full px-2.5 py-1 text-[0.72rem] font-semibold leading-tight text-text',
  'bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] shadow-[0_1px_6px_rgba(15,23,42,0.08)]',
  'ring-1 ring-[color-mix(in_srgb,var(--color-border)_80%,transparent)] backdrop-blur-[6px]'
)

export const fabClass = cn(
  'pointer-events-auto relative flex h-touch-min w-touch-min items-center justify-center rounded-full leading-none opacity-[0.85]',
  'bg-surface text-primary-dark',
  'ring-1 ring-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))]',
  'shadow-[0_4px_16px_color-mix(in_srgb,var(--color-primary)_12%,rgba(15,23,42,0.14))]',
  'transition-[transform,box-shadow,background,color] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
  'touch-manipulation hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))]',
  'hover:shadow-[0_6px_20px_color-mix(in_srgb,var(--color-primary)_16%,rgba(15,23,42,0.14))]',
  'active:scale-[0.94]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]'
)

export function speedDialTriggerClass(open?: boolean) {
  return cn(
    fabClass,
    open &&
      cn(
        'opacity-100 bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] text-primary',
        'ring-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]'
      )
  )
}

export function speedDialTriggerIconClass(open?: boolean) {
  return cn(
    'flex h-[1.35rem] w-[1.35rem] items-center justify-center leading-none transition-transform duration-[var(--duration-normal)] ease-[var(--ease-spring)] motion-reduce:transition-none',
    '[&_svg]:h-full [&_svg]:w-full',
    open && 'rotate-90'
  )
}

export const speedDialTypeIconIncomeClass = 'text-[1.2rem] font-bold leading-none text-income'

export const speedDialTypeIconExpenseClass = 'text-[1.35rem] font-bold leading-none text-expense'
