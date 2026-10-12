import { cn } from '../../utils/cn'

/** Dark in both themes, so the undo bar reads as a transient system message. */
export const undoToastClass = cn(
  'relative flex w-[min(92vw,24rem)] items-center justify-between gap-3 overflow-hidden rounded-[var(--radius-sm)]',
  'bg-[#1c1b19] py-1 pe-1 ps-4 text-[0.86rem] text-[#efece6] shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10',
  // Clears the mobile bottom navigation; desktop has none.
  'mb-[calc(4.75rem+var(--safe-bottom))] md:mb-0',
  'animate-[fadeInUp_var(--duration-normal)_var(--ease-out)] motion-reduce:animate-none'
)

export const undoToastLabelClass = 'min-w-0 flex-1 truncate font-medium'

export const undoToastActionClass = cn(
  'inline-flex min-h-touch-min shrink-0 items-center rounded-[calc(var(--radius-sm)-2px)] border-none bg-transparent px-3',
  'cursor-pointer font-extrabold text-primary-light hover:bg-white/10',
  // The bar clips an outer ring and is dark in both themes.
  'focus-ring-inset [--focus-ring:var(--color-primary-light)]'
)

export const undoToastBarClass = cn(
  'pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-right bg-primary-light',
  'motion-reduce:hidden'
)
