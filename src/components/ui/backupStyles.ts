import { cn, cx } from '../../utils/cn'

export const backupCardTextClass = 'm-0 mb-3 text-[0.85rem] leading-[1.8] text-muted'

export const backupCardActionsClass = 'flex flex-col gap-2 [&>button]:w-full'

export const backupCardMetaClass = 'm-0 mt-3 text-[0.8rem] leading-[1.8] text-muted'

export const backupLinkButtonClass = cx(
  'cursor-pointer border-none bg-transparent p-0 font-bold text-primary underline-offset-4',
  'hover:underline'
)

export const backupModeGroupClass = 'mt-3 flex flex-col gap-2'

export function backupModeOptionClass(selected: boolean) {
  return cn(
    'flex w-full cursor-pointer flex-col gap-0.5 rounded-[var(--radius)] border-[1.5px] bg-surface px-3 py-2.5 text-start',
    'transition-[border-color,background] duration-[var(--duration-fast)]',
    selected
      ? 'border-primary bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]'
      : 'border-border'
  )
}

export const backupModeTitleClass = 'text-[0.88rem] font-bold text-text'

export const backupModeHintClass = 'text-[0.78rem] leading-[1.7] text-muted'

export const backupSummaryClass = 'm-0 text-[0.9rem] font-bold text-text'

export const backupNoteClass = 'm-0 mt-2 text-[0.8rem] leading-[1.8] whitespace-pre-line text-muted'

export const backupProgressLabelClass = 'm-0 mb-2 text-[0.85rem] text-text'
