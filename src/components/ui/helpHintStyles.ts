import { cn, cx } from '../../utils/cn'

export const helpHintTriggerClass = cx(
  'help-hint relative ms-1.5 inline-flex h-[1.3rem] w-[1.3rem] shrink-0 items-center justify-center rounded-full align-middle',
  'border-[1.5px] border-current bg-transparent p-0 text-[0.72rem] font-bold leading-none text-inherit',
  'cursor-pointer transition-[background,transform] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)]',
  // The visible ring stays small; the hit area reaches a comfortable tap size.
  'after:absolute after:-inset-3 after:content-[""]'
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
