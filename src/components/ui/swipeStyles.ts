import { cn } from '../../utils/cn'
import type { SwipeDirection } from '../../utils/swipeGesture'

export const swipeRowClass = 'relative overflow-hidden rounded-[var(--radius)]'

/** `touch-action: pan-y`: vertical scrolling stays native, sideways moves reach the hook. */
export const swipeContentClass = 'relative touch-pan-y'

/** What lets go of the finger snaps back with this transition. */
export const swipeSnapClass =
  'transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)]'

/** The action revealed behind the card: a right drag uncovers its left edge. */
export type SwipeHintTone = 'income' | 'expense' | 'muted'

export function swipeHintClass(direction: SwipeDirection, tone: SwipeHintTone) {
  return cn(
    'absolute inset-0 flex items-center px-5 text-[0.85rem] font-bold',
    direction === 'right' ? 'justify-start [direction:ltr]' : 'justify-end [direction:ltr]',
    tone === 'income'
      ? 'bg-[var(--color-income-bg)] text-[var(--color-income)]'
      : tone === 'expense'
      ? 'bg-[var(--color-expense-bg)] text-[var(--color-expense)]'
      : 'bg-[var(--color-border)] text-muted'
  )
}
