import { cn } from '../../utils/cn'

export const settingsPageClass = 'flex flex-col gap-5'

export const settingsSectionClass = 'flex flex-col gap-3'

export const settingsSectionTitleClass =
  'm-0 px-1 text-[0.8rem] font-bold tracking-[0.02em] text-muted'

export const settingsSectionItemsClass = 'flex flex-col gap-3 [&>.card]:m-0'

export const settingsGoogleAccountRowClass = 'flex items-center gap-3'

export const settingsGoogleAccountAvatarClass =
  'h-9 w-9 shrink-0 rounded-full border-2 border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] object-cover shadow-[0_2px_10px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]'

export const settingsGoogleAccountBodyClass = 'min-w-0'

export const settingsGoogleAccountEmailClass = 'text-[0.85rem] font-semibold text-text'

export const formListItemClass = cn(
  'mb-3 rounded-sm bg-bg p-3 transition-[transform,box-shadow] duration-[var(--duration-fast)]',
  'hover:-translate-x-0.5 hover:shadow-[var(--shadow)]'
)

export const formListHeaderClass = 'flex items-center justify-between'

export const formTypeBadgeClass = cn(
  'rounded-xl border border-border bg-surface px-2 py-[0.15rem] text-[0.7rem] text-muted'
)
