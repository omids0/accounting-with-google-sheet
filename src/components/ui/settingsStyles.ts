import { accordionCardIconClass } from './accordionCardStyles'
import { cn } from '../../utils/cn'

export const settingsPageClass = cn('flex w-full flex-col gap-3', '[&_.settings-section]:w-full')
export const settingsSectionClass = 'settings-section flex w-full flex-col'

/** Extra classes for the section header card (pass to `cardClassName`). */
export function settingsSectionCardClass(expanded?: boolean) {
  return cn(
    'm-0 overflow-hidden p-0 text-base font-normal leading-normal',
    expanded && 'border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]'
  )
}

export function settingsSectionIconClass(expanded?: boolean) {
  return cn(
    accordionCardIconClass,
    'transition-[background,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    expanded && '[background:color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))]'
  )
}

/** Inner cards keep only the column gap (their own bottom margin is dropped). */
export const settingsSectionItemsClass = 'flex flex-col gap-3 pt-3 [&>*]:mb-0!'

export const settingsGoogleAccountRowClass = 'flex items-center gap-3'

export const settingsGoogleAccountAvatarClass =
  'h-9 w-9 shrink-0 rounded-full border-2 border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] object-cover shadow-[0_2px_10px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]'

export const settingsGoogleAccountBodyClass = 'min-w-0'

export const settingsGoogleAccountEmailClass = 'text-[0.85rem] font-semibold text-text'
