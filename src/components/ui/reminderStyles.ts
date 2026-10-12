import { cn } from '../../utils/cn'

/** Reminders settings — single full-width column on all breakpoints. */
export const remindersPageClass = cn(
  'flex w-full flex-col gap-2',
  '[&>.mb-stack]:mb-0 [&>div]:w-full'
)

export const reminderStatusLineClass =
  'flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] leading-snug text-text'

export function reminderStatusDotClass(status: string) {
  return cn(
    'inline-block size-2.5 flex-none rounded-full',
    status === 'granted' && 'bg-success',
    status === 'denied' && 'bg-danger',
    (status === 'prompt' || status === 'unsupported') && 'bg-warning',
    status === 'checking' && 'bg-border'
  )
}

export const reminderStatusHintClass = 'mt-2 mb-0 text-[0.8rem] leading-relaxed text-muted'

/** Link-styled inline action, e.g. «چطور فعال کنم؟». */
export const reminderTextButtonClass = cn(
  'cursor-pointer border-0 bg-transparent p-0 text-[0.82rem] font-semibold text-primary underline',
  'underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary'
)

/** One reminder: text, time and switch on a line, dashed separator like the wireframe. */
export const reminderRowClass = cn(
  'border-t border-dashed border-border py-3 first:border-t-0 first:pt-0 last:pb-0'
)

export const reminderRowMainClass = 'flex items-center gap-2.5'

export const reminderRowTextClass = 'min-w-0 flex-1 text-[0.88rem] leading-snug text-text'

export const reminderRowHintClass = 'mt-0.5 block text-[0.75rem] leading-snug text-muted'

export const reminderRowTimeClass = 'w-[5.75rem] flex-none'

export const reminderRowExtraClass = 'mt-2 w-[9rem]'

export const reminderAdvancedToggleClass = cn(
  reminderTextButtonClass,
  'mx-auto my-1 block font-normal text-muted'
)
