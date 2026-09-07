import { cn } from '../../utils/cn'

export const settingsPageClass = cn('flex w-full flex-col gap-2', '[&_.settings-section]:w-full')
export const settingsSectionClass = 'settings-section flex w-full flex-col gap-2'

export const settingsSectionTitleClass =
  'm-0 flex-1 text-[0.88rem] font-extrabold tracking-[-0.01em] text-text'

export function settingsSectionTriggerClass(expanded?: boolean) {
  return cn(
    'flex w-full items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-right transition-[background,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    'hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_28%,transparent)]',
    expanded &&
      'border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))]'
  )
}

export function settingsSectionChevronClass(expanded?: boolean) {
  return cn(
    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    expanded && 'rotate-180'
  )
}

export const settingsSectionItemsClass = 'flex flex-col gap-3 pt-1 [&>.card]:m-0'

export const settingsGoogleAccountRowClass = 'flex items-center gap-3'

export const settingsGoogleAccountAvatarClass =
  'h-9 w-9 shrink-0 rounded-full border-2 border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] object-cover shadow-[0_2px_10px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]'

export const settingsGoogleAccountBodyClass = 'min-w-0'

export const settingsGoogleAccountEmailClass = 'text-[0.85rem] font-semibold text-text'
