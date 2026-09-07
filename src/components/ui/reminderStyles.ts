import { cn } from '../../utils/cn'

/** Reminders settings — single full-width column on all breakpoints. */
export const remindersPageClass = cn(
  'flex w-full flex-col gap-2',
  '[&>.mb-stack]:mb-0 [&>div]:w-full'
)

/** Compact reminder rule fields — one row on desktop. */
export const reminderRuleFieldsClass = cn(
  'mt-4 grid grid-cols-1 gap-3',
  'sm:grid-cols-2',
  'lg:grid-cols-[minmax(0,12.5rem)_minmax(0,7.5rem)_minmax(0,7.5rem)] lg:items-end lg:gap-4'
)

export const reminderTimeFieldsClass = cn(
  'mt-4 grid grid-cols-2 gap-3 lg:max-w-[16rem] lg:items-end'
)

export const reminderCheckboxRowClass =
  'mt-3 flex items-center gap-2 text-[0.88rem] leading-snug text-text'
