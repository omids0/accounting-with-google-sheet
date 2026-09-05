import { cn } from '../../utils/cn'

export const fabContainerClass = cn(
  'pointer-events-none fixed bottom-[calc(5.75rem+var(--safe-bottom)+5px)] left-1/2 z-[25] flex w-full max-w-[480px] -translate-x-1/2 justify-start px-5'
)

export const speedDialContainerClass = 'z-[25]'

export const speedDialBackdropClass = cn(
  'fixed inset-0 z-[24] cursor-default border-none bg-[rgba(15,23,42,0.28)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)]'
)

export const speedDialClass = 'relative flex flex-col items-start'

export const speedDialActionsClass = 'mb-[0.65rem] flex flex-col-reverse items-start gap-[0.65rem]'

export function speedDialActionWrapClass(open?: boolean) {
  return cn(
    'pointer-events-none flex items-center opacity-0 [transform:translateY(10px)_scale(0.85)]',
    'transition-[opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    '[transition-delay:calc(var(--action-index)*35ms)]',
    open && 'pointer-events-auto translate-y-0 scale-100 opacity-100'
  )
}

export const speedDialActionClass = cn(
  'flex h-touch-min w-touch-min items-center justify-center rounded-full border border-[rgba(15,118,110,0.18)] opacity-90',
  'bg-surface text-primary shadow-[0_3px_12px_rgba(15,23,42,0.12)]',
  'transition-[transform,box-shadow,opacity] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
  'hover:enabled:opacity-90 hover:enabled:shadow-[0_5px_16px_rgba(15,23,42,0.16)] active:enabled:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-90'
)

export const speedDialActionIncomeClass = cn(
  speedDialActionClass,
  'border-[var(--color-income-border)] bg-[var(--color-income-bg)] text-[var(--color-income)]'
)

export const speedDialActionExpenseClass = cn(
  speedDialActionClass,
  'border-[var(--color-expense-border)] bg-[var(--color-expense-bg)] text-[var(--color-expense)]'
)

export const speedDialActionIconClass =
  'flex h-[1.125rem] w-[1.125rem] items-center justify-center leading-none [&_svg]:h-full [&_svg]:w-full'

export const fabClass = cn(
  'pointer-events-auto relative flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full leading-none text-white opacity-90',
  '[background:linear-gradient(145deg,var(--color-primary-dark),var(--color-primary-light))]',
  'shadow-[0_4px_16px_rgba(15,118,110,0.35)] transition-[transform,box-shadow,opacity] duration-[var(--duration-fast)]',
  'before:pointer-events-none before:absolute before:inset-[2px] before:rounded-full before:content-[""] before:[background:linear-gradient(145deg,rgba(255,255,255,0.2)_0%,transparent_60%)]',
  'hover:opacity-90 hover:shadow-[0_6px_22px_rgba(15,118,110,0.45)] active:scale-[0.92]'
)

export function speedDialTriggerClass(open?: boolean) {
  return cn(
    fabClass,
    open && 'ring-2 ring-[color-mix(in_srgb,var(--color-primary-light)_45%,transparent)]'
  )
}

export function speedDialTriggerIconClass(open?: boolean) {
  return cn(
    'flex h-[1.35rem] w-[1.35rem] items-center justify-center leading-none transition-transform duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
    '[&_svg]:h-full [&_svg]:w-full',
    open && 'rotate-90'
  )
}

export const speedDialTypeIconIncomeClass = 'text-[1.25rem] font-bold leading-none text-income'

export const speedDialTypeIconExpenseClass = 'text-[1.25rem] font-bold leading-none text-expense'
