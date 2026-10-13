import { cn, cx } from '../../utils/cn'

export const backupCardTextClass = 'm-0 mb-3 text-[0.85rem] leading-[1.8] text-muted'

export const backupCardMetaClass = 'm-0 mt-3 text-[0.8rem] leading-[1.8] text-muted'

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

/** `/settings/backup` (round 7, Task I). */
export const backupPageClass = 'mx-auto flex w-full max-w-[640px] flex-col gap-3'

export const backupStatusLabelClass = 'm-0 text-[0.78rem] text-muted'

export const backupStatusDateClass = 'm-0 mt-1 text-[0.95rem] font-extrabold text-text'

export const backupStatusFolderClass = 'm-0 mt-1 text-[0.78rem] text-success'

export const backupSectionTitleClass = 'm-0 mt-3 mb-1 text-[0.8rem] font-bold text-muted'

export const backupVersionListClass = 'm-0 flex list-none flex-col p-0'

export const backupVersionRowClass =
  'flex min-h-12 items-center gap-3 border-t border-border py-2 first:border-t-0'

export const backupVersionDayClass = cx(
  'flex size-9 flex-none items-center justify-center rounded-[var(--radius-sm)]',
  'bg-[var(--color-accent-soft)] text-[0.85rem] font-bold text-text'
)

export const backupVersionNameClass = 'block truncate text-[0.85rem] font-semibold text-text'

export const backupVersionMetaClass = 'mt-0.5 block text-[0.74rem] text-muted'

export const backupPageActionsClass = 'flex flex-wrap items-center gap-2'
