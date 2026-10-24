import { cn, cx } from '../../utils/cn'

// The button is a full 44 px tap box; the visible ring is its ::before. Only the vertical
// margins are negative (they keep the line height): sideways it occupies its own width, so
// it never overlaps the text or a button next to it.
export const helpHintTriggerClass = cx(
  'help-hint relative -my-[0.72rem] ms-0.5 inline-flex size-touch-min shrink-0 items-center justify-center align-middle',
  'border-none bg-transparent p-0 text-[0.72rem] font-bold leading-none text-inherit cursor-pointer',
  'before:absolute before:size-[1.3rem] before:rounded-full before:border-[1.5px] before:border-current before:bg-transparent before:content-[""]',
  'before:transition-[background] before:duration-[var(--duration-fast)] hover:before:bg-[color-mix(in_srgb,currentColor_12%,transparent)]'
)

export function helpHintPopoverClass(placeAbove: boolean) {
  return cn(
    'fixed z-[60] w-[min(18rem,calc(100vw-1.5rem))] rounded-[var(--radius-sm)] border border-border bg-surface p-3',
    'text-right text-[0.8rem] font-normal leading-[1.85] text-text shadow-[var(--shadow-lg)]',
    'animate-[fadeIn_var(--duration-fast)_var(--ease-out)] motion-reduce:animate-none',
    !placeAbove &&
      'before:absolute before:-top-[7px] before:right-[var(--help-arrow-right)] before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-border before:bg-surface before:content-[""]'
  )
}

export const helpHintTitleClass = 'mb-0.5 block text-[0.84rem] font-bold text-text'

export const helpHintTextClass = 'm-0 text-muted'

export const helpHintActionsClass = 'mt-1.5 flex flex-wrap items-center gap-x-4'

export const helpHintActionClass = cx(
  'inline-flex min-h-[2.25rem] items-center border-none bg-transparent p-0 text-[0.78rem] font-bold text-primary-dark',
  'cursor-pointer underline-offset-4 hover:underline focus-visible:underline'
)
