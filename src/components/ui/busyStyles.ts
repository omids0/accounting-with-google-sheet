import { cx } from '../../utils/cn'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export const spinnerSizeClass: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10'
}

export const spinnerWrapClass = 'inline-flex shrink-0 items-center justify-center'

export const spinnerRingClass = 'animate-spin motion-reduce:hidden'

/** Reduced motion: the ring does not turn, three still dots say «waiting» instead. */
export const spinnerStillDotsClass = 'hidden motion-reduce:inline-flex'

/** Full screen, above the drawer and every sheet (z-100), under the toasts (z-10000). */
export const busyOverlayRootClass = cx(
  'fixed inset-0 z-[200] box-border flex items-center justify-center p-6 outline-none',
  'transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]'
)

export const busyOverlayScrimShownClass = 'bg-[var(--color-overlay)]'

export const busyOverlayCardClass = cx(
  'flex w-full max-w-[20rem] flex-col items-center gap-3 rounded-[calc(var(--radius)+4px)]',
  'border border-border bg-surface px-6 py-7 text-center shadow-[var(--shadow)]',
  'transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)]'
)

export const busyOverlayMessageClass = 'm-0 text-[1rem] font-bold leading-[1.9] text-text'

export const busyOverlayHintClass = 'm-0 text-[0.8rem] leading-[1.8] text-muted'

export const busyOverlayBarClass = 'w-full'
