import { scrollbarHiddenClass } from './scrollbarStyles'
import { cn, cx } from '../../utils/cn'

/** `drawer` slides over the page on phones; `rail` is the tablet icon column; `sidebar` is always open on desktop. */
export type AppMenuVariant = 'drawer' | 'sidebar' | 'rail'

export const appMenuBackdropClass = cx(
  'fixed inset-0 z-40 cursor-default border-none bg-[var(--color-overlay-light)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)] backdrop-blur-[5px]'
)

export function appMenuDrawerClass(variant: AppMenuVariant) {
  return cn(
    'flex flex-col overflow-hidden bg-surface',
    'border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))]',
    variant === 'drawer'
      ? cn(
          'fixed bottom-0 right-0 top-0 z-[41] w-[min(19rem,88vw)] border-s',
          'shadow-[-10px_0_40px_color-mix(in_srgb,var(--color-primary)_14%,rgba(15,23,42,0.22))]',
          'animate-[app-menu-slide-in_var(--duration-normal)_var(--ease-out)]'
        )
      : 'sticky top-0 z-30 h-dvh max-h-dvh w-[var(--sidebar-width)] shrink-0 self-start border-e'
  )
}

/** One 52px row: avatar, name over the active sheet, theme switch at the end. */
export function appMenuUserRowClass(variant: AppMenuVariant) {
  return cn(
    'flex min-h-[3.25rem] shrink-0 items-center gap-2.5 border-b border-border px-3.5',
    variant === 'drawer' ? 'pb-1.5 pt-[max(0.375rem,var(--safe-top))]' : 'py-1.5'
  )
}

export const appMenuAvatarClass = 'h-8 w-8 flex-shrink-0 rounded-full object-cover'

export const appMenuAvatarPlaceholderClass = cx(
  appMenuAvatarClass,
  'flex items-center justify-center bg-accent-soft text-primary-dark'
)

export const appMenuUserTextClass = 'flex min-w-0 flex-1 flex-col'

export const appMenuNameClass = 'truncate text-[0.88rem] font-bold leading-tight text-text'

export const appMenuSheetLineClass = 'truncate text-[0.72rem] leading-tight text-muted'

export const appMenuScrollBodyClass = cx(
  scrollbarHiddenClass,
  'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain',
  '[-webkit-overflow-scrolling:touch]'
)

export const appMenuItemsClass = cx(
  'flex flex-col px-2 py-1',
  '[&>.app-menu-section]:animate-[menuItemIn_0.38s_var(--ease-page)_both]',
  '[&>.app-menu-section:nth-child(2)]:[animation-delay:0.04s]',
  '[&>.app-menu-section:nth-child(3)]:[animation-delay:0.08s]',
  '[&>.app-menu-section:nth-child(4)]:[animation-delay:0.12s]'
)

export const appMenuSectionClass = 'app-menu-section flex flex-col'

/** Small muted header above each menu group. */
export const appMenuSectionLabelClass =
  'm-0 px-3 pb-0.5 pt-2 text-[0.68rem] font-bold leading-[0.9rem] tracking-[0.02em] text-muted'

export const appMenuGroupClass = 'app-menu-group flex flex-col'

export const appMenuFooterClass = cx(
  'app-menu-footer m-0 shrink-0 truncate border-t border-border px-3.5 pt-2 text-center',
  'pb-[max(0.5rem,var(--safe-bottom))] text-[0.7rem] leading-4 text-muted'
)

export function appMenuItemClass(active?: boolean, variant?: 'default' | 'parent' | 'sub') {
  return cn(
    'app-menu-item flex w-full items-center gap-3 rounded-xl text-right font-semibold text-text transition-[background,color,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    variant === 'parent' && 'justify-start',
    // 40px rows keep all four groups on an 844px-tall phone without scrolling.
    variant === 'sub'
      ? 'min-h-[2.5rem] px-3 py-1.5 text-[0.86rem]'
      : 'min-h-[2.5rem] px-3 py-1.5 text-[0.92rem]',
    active &&
      cn(
        'text-primary-dark',
        'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
        'shadow-[inset_-3px_0_0_var(--color-primary)]'
      ),
    !active && 'hover:bg-accent-soft active:scale-[0.99]'
  )
}

export function appMenuItemIconClass(active?: boolean) {
  // Bare icon, no box: the row's tint and inset line carry the active state.
  return cn(
    'flex h-6 w-6 flex-shrink-0 items-center justify-center text-primary-dark',
    'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    active && 'text-primary'
  )
}

export const appMenuItemLabelClass = 'flex-1 truncate text-right'

export function appMenuChevronClass(expanded?: boolean) {
  return cn(
    'flex items-center justify-center text-muted transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    expanded && 'rotate-180'
  )
}

export const appMenuSubmenuClass = cx(
  'flex flex-col gap-[0.12rem] border-s-2 border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] ps-[1.1rem]',
  'animate-[submenuReveal_0.28s_var(--ease-out)_both]'
)

export const appMenuSubmenuLabelClass = cx(
  'px-[0.85rem] pb-[0.15rem] pt-[0.55rem] text-[0.7rem] font-extrabold tracking-[0.04em] text-muted',
  'before:me-1.5 before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] before:content-[""]'
)

export const appMenuThemeClass = cx(
  'relative grid h-[1.85rem] w-[3.55rem] flex-shrink-0 grid-cols-2 items-center rounded-full p-[0.14rem]',
  'bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] ring-1 ring-border'
)

export function appMenuThemeBtnClass(active?: boolean) {
  return cn(
    'relative z-[1] flex h-full w-full items-center justify-center rounded-full',
    'transition-[color,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    active ? 'text-primary-dark' : 'text-muted'
  )
}

export function appMenuThemeThumbClass(isDark?: boolean) {
  return cn(
    'pointer-events-none absolute inset-y-[0.14rem] w-[calc(50%-0.14rem)] rounded-full bg-surface',
    'shadow-[0_1px_4px_rgba(15,23,42,0.18)]',
    'transition-[inset-inline-start] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    isDark ? 'start-[calc(50%)]' : 'start-[0.14rem]'
  )
}

export const appMenuUpdateDotClass = cx(
  'h-[0.5rem] w-[0.5rem] flex-shrink-0 rounded-full bg-[var(--color-warning)]',
  'shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-warning)_22%,transparent)]',
  'animate-[syncPulse_1.6s_ease-in-out_infinite]'
)

/** Tablet icon rail (64px): icons only, the label shows as a tooltip on hover, focus or press. */
export const appMenuRailClass = cx(
  'sticky top-0 z-30 flex h-dvh w-[var(--rail-width)] shrink-0 flex-col items-center gap-0.5 self-start',
  'border-e border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))] bg-surface py-2'
)

export function appRailItemClass(active?: boolean) {
  return cn(
    'group relative flex h-10 w-11 shrink-0 items-center justify-center rounded-xl text-primary-dark',
    'transition-[background,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    active
      ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary'
      : 'hover:bg-accent-soft'
  )
}

export const appRailTooltipClass = cx(
  'pointer-events-none absolute start-[calc(100%+0.4rem)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md',
  'bg-text px-2 py-1 text-[0.74rem] font-semibold text-surface opacity-0 shadow-md transition-opacity',
  'group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100'
)

export const appRailDividerClass = 'my-1 h-px w-6 shrink-0 bg-border'

/** Orange «update ready» dot on the rail's menu button (like the mobile header's). */
export const appRailUpdateDotClass = cx(
  'pointer-events-none absolute end-1 top-1 h-2 w-2 rounded-full bg-[var(--color-warning)] ring-2 ring-[var(--color-surface)]',
  'animate-[syncPulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none'
)
