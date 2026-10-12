import { appScrollbarClass } from './scrollbarStyles'
import { cn, cx } from '../../utils/cn'

const pageEnterAnim = 'animate-[pageEnter_var(--duration-page)_var(--ease-page)_both]'

const pageContentChildAnims = cx(
  `[&>.empty-state]:${pageEnterAnim}`,
  `[&>.login-page]:${pageEnterAnim}`,
  `[&>.skeleton-dashboard]:${pageEnterAnim}`,
  `[&>.skeleton-list]:${pageEnterAnim}`,
  `[&>.skeleton-settings]:${pageEnterAnim}`,
  `[&>.skeleton-records-card]:${pageEnterAnim}`,
  `[&>.skeleton-form]:${pageEnterAnim}`,
  `[&>*>.alert]:${pageEnterAnim}`,
  `[&>*>.card]:${pageEnterAnim}`,
  `[&>*>.card-header-row]:${pageEnterAnim}`,
  `[&>*>.dashboard-flow-section]:${pageEnterAnim}`,
  `[&>*>.dashboard-hero-card]:${pageEnterAnim}`,
  `[&>*>.dashboard-page]:${pageEnterAnim}`,
  `[&>*>.empty-state]:${pageEnterAnim}`,
  `[&>*>.form-tabs]:${pageEnterAnim}`,
  `[&>*>.records-page]:${pageEnterAnim}`,
  `[&>*>.stat-grid]:${pageEnterAnim}`,
  `[&>*>.tabs]:${pageEnterAnim}`,
  `[&>*>form]:${pageEnterAnim}`
)

const pageContentStagger = cx(
  '[&>*>*:nth-child(1)]:[animation-delay:0.04s]',
  '[&>*>*:nth-child(2)]:[animation-delay:0.08s]',
  '[&>*>*:nth-child(3)]:[animation-delay:0.12s]',
  '[&>*>*:nth-child(4)]:[animation-delay:0.16s]',
  '[&>*>*:nth-child(5)]:[animation-delay:0.2s]',
  '[&>*>*:nth-child(6)]:[animation-delay:0.24s]',
  '[&>*>*:nth-child(7)]:[animation-delay:0.28s]',
  '[&>*>*:nth-child(8)]:[animation-delay:0.32s]',
  '[&>*>*:nth-child(9)]:[animation-delay:0.36s]',
  '[&>*>*:nth-child(10)]:[animation-delay:0.4s]'
)

export const pageContentClass = cx(
  'page-content',
  'animate-[pageFade_var(--duration-page)_var(--ease-page)_both]',
  pageContentChildAnims,
  pageContentStagger
)

export const pageContentTransitioningClass = cx(
  pageContentClass,
  'pointer-events-none opacity-70 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)]'
)

export const animateInClass = 'animate-[scaleIn_0.65s_var(--ease-page)]'

export const appLayoutClass = cx(
  'mx-auto flex min-h-dvh w-full flex-col overflow-x-clip bg-bg',
  'max-w-[480px] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-border)_40%,transparent),0_8px_40px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]',
  'md:max-w-none md:shadow-none'
)

export const appShellClass = cx(
  'flex min-h-dvh w-full flex-col',
  'md:h-dvh md:min-h-0 md:flex-row md:items-stretch md:overflow-hidden'
)

export const appContentColumnClass = cx(
  'relative flex min-w-0 flex-1 flex-col min-h-dvh',
  'mx-auto w-full max-w-[480px] md:h-dvh md:min-h-0 md:max-w-none'
)

export const appMainClass = cx(
  appScrollbarClass,
  // Bottom room = bottom nav (5.75rem) + speed-dial button and its gap (4rem),
  // so the last card scrolls fully clear of both.
  'min-h-0 flex-1 overflow-y-auto p-[var(--space-page)] pb-[calc(9.75rem+var(--safe-bottom))]',
  // Tablet keeps the floating speed dial (4rem); desktop moves it into the header.
  'md:mx-auto md:w-full md:max-w-[var(--content-max-width)] md:pb-[calc(var(--space-page)+4rem)] xl:pb-[calc(var(--space-page)+1rem)]'
)

/** «پرش به محتوا»: the first Tab stop, hidden until it has focus. */
export const skipLinkClass = cx(
  'sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-[calc(var(--safe-top)+0.6rem)] focus:z-[100]',
  'focus:rounded-lg focus:bg-text focus:px-4 focus:py-2 focus:text-[0.85rem] focus:font-bold focus:text-surface focus:shadow-lg'
)

/** Shared shell header bar metrics — main header + desktop sidebar profile. */
export const appShellHeaderBarClass = cx(
  'py-[0.65rem] pt-[max(0.65rem,var(--safe-top))]',
  'border-b border-[var(--header-border)] shadow-[var(--header-shadow)]',
  // Static gradient: an infinite background-position loop + backdrop blur on an
  // always-visible sticky bar repainted it every frame. The gradient is opaque.
  '[background:var(--header-bg)] [--focus-ring:var(--focus-ring-on-brand)]',
  'md:box-border md:min-h-[var(--shell-header-height)]',
  // Desktop: one 48px row (title, period / filters, page actions).
  'xl:min-h-[var(--desktop-header-height)] xl:py-0 xl:pt-0'
)

/**
 * One fixed row (the 44px icon buttons) on every page, with or without the sync
 * badge, so the content below never jumps when navigating.
 */
export const appHeaderClass = cx(
  'app-header sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] grid-rows-[var(--touch-min)] items-center gap-2 px-4 text-white',
  appShellHeaderBarClass,
  'xl:flex xl:gap-3 xl:px-5'
)

export const appHeaderWithBackClass = cx(
  '[&_[data-header-center]]:items-center',
  '[&_[data-header-title]]:text-center',
  '[&_[data-sync-badge]]:justify-center'
)

/** Title + compact badge stack; fits inside the 44px header row. */
export const appHeaderCenterClass = cx(
  'flex h-full min-w-0 flex-col items-start justify-center gap-[0.15rem] overflow-hidden',
  'xl:flex-none xl:flex-row xl:items-center xl:gap-2.5'
)

export const appHeaderTitleClass = cx(
  'w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-start text-[1rem] font-extrabold leading-[1.3] tracking-[-0.02em] xl:w-auto',
  '[text-shadow:0_1px_3px_rgba(15,23,42,0.22)]'
)

export const headerIconBtnClass = cx(
  'flex h-touch-min w-touch-min flex-shrink-0 items-center justify-center rounded-full leading-none',
  'bg-white/15 ring-1 ring-white/10 transition-[background,transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
  'hover:bg-white/30 hover:ring-white/20 active:scale-90'
)

export function headerIconBtnMenuClass(active?: boolean) {
  return cn(headerIconBtnClass, 'text-white', active && 'bg-white/30')
}

export const headerMenuDotClass = cx(
  'pointer-events-none absolute end-[0.45rem] top-[0.45rem] h-[0.5rem] w-[0.5rem] rounded-full',
  'bg-[var(--color-warning)] ring-2 ring-white/80',
  'animate-[syncPulse_1.6s_ease-in-out_infinite]'
)

export const headerGridMenuClass = 'col-start-1 row-start-1'

export const headerGridCenterClass = 'col-start-2 row-start-1'

export const headerGridEndClass = 'col-start-3 row-start-1'

export const headerBackBtnClass = cx(
  headerIconBtnClass,
  headerGridEndClass,
  'text-white xl:h-9 xl:w-9'
)

/** Desktop header slot for page controls: the period chip, active filters. */
export const appHeaderToolbarClass = cx(
  'hidden min-w-0 items-center gap-2 overflow-hidden xl:flex',
  '[&_.active-filter-chips]:mb-0 [&_.active-filter-chips]:flex-nowrap [&_button]:min-h-9 [&_button]:py-1',
  '[&_.text-muted]:text-white/85'
)

/** Desktop header slot for the page's speed-dial actions. */
export const appHeaderActionsClass = 'hidden shrink-0 items-center gap-1.5 xl:ms-auto xl:flex'

export const headerActionBtnClass = cn(
  headerIconBtnClass,
  'h-9 w-9 text-white disabled:pointer-events-none disabled:opacity-45'
)

/** The page's primary action («+ ثبت چک»): a light pill on the brand header. */
export const headerPrimaryActionClass = cx(
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 text-[0.84rem] font-bold text-primary-dark',
  'shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-[opacity,transform] duration-[var(--duration-fast)] hover:opacity-90 active:scale-95',
  'disabled:pointer-events-none disabled:opacity-60'
)

export const headerIconSpacerClass = cx('h-touch-min w-touch-min flex-shrink-0', headerGridEndClass)

export * from './sidebarMenuStyles'

type SyncStatus = 'online' | 'syncing' | 'offline' | 'error'

export const syncStatusBadgeClass = cx(
  'inline-flex max-w-full items-center gap-[0.35rem] rounded-full px-[0.45rem] py-[0.05rem]',
  'bg-black/12 text-[0.68rem] font-semibold leading-[1.35] text-white ring-1 ring-white/18',
  '[text-shadow:0_1px_2px_rgba(15,23,42,0.2)]'
)

export function syncStatusDotClass(status: SyncStatus) {
  return cn(
    'h-[0.45rem] w-[0.45rem] flex-shrink-0 rounded-full bg-white/85',
    status === 'online' && 'bg-[#86efac] shadow-[0_0_0_2px_rgba(134,239,172,0.35)]',
    status === 'syncing' && 'animate-[syncPulse_1.2s_ease-in-out_infinite] bg-[#fde68a]',
    (status === 'offline' || status === 'error') && 'bg-[#fca5a5]'
  )
}

export const syncStatusLabelClass = 'overflow-hidden text-ellipsis whitespace-nowrap'
