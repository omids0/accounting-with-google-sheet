import { accordionCardIconClass } from './accordionCardStyles'
import { cn, cx } from '../../utils/cn'

export const settingsPageClass = cx('flex w-full flex-col gap-3', '[&_.settings-section]:w-full')
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

export const settingsActiveSheetClass = 'm-0 truncate px-1 text-[0.82rem] text-muted'

export const settingsActiveSheetNameClass = 'font-bold text-text'

/** Desktop (≥ 1280px): section list on the right, the selected section on the left. */
export const settingsTwoPaneClass = 'grid grid-cols-[15rem_minmax(0,1fr)] items-start gap-5'

export const settingsPaneNavClass = 'sticky top-0 flex flex-col gap-1'

export function settingsPaneNavItemClass(active?: boolean) {
  return cn(
    'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border-none bg-transparent px-2.5 py-1.5',
    'text-start font-[inherit] text-[0.9rem] font-semibold text-text transition-[background] duration-[var(--duration-fast)]',
    '[&>span]:h-8 [&>span]:w-8',
    active
      ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary-dark'
      : 'hover:bg-accent-soft'
  )
}

export const settingsPaneContentClass = 'm-0 flex min-w-0 flex-col gap-3'

export const settingsPaneTitleClass = cx(
  'm-0 flex items-baseline gap-2 text-[1.02rem] font-extrabold text-text',
  '[&>small]:text-[0.78rem] [&>small]:font-medium [&>small]:text-muted'
)

/** The section's cards side by side when the pane is wide enough; one alone spans it. */
export const settingsPaneItemsClass =
  'grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] items-start gap-3 [&>*]:mb-0!'

/** «دارایی‌های صندوقچه»: class heading and one row per catalog asset. */
export const settingsVaultClassTitleClass = 'mt-3 mb-1 text-[0.78rem] font-bold text-muted'

export function settingsVaultAssetRowClass(active: boolean) {
  return cx(
    'flex items-center gap-2 border-b border-border py-2 last:border-b-0',
    !active && 'opacity-60'
  )
}

export const settingsVaultAssetMetaClass =
  'mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-muted'
