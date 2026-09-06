import { appScrollbarClass } from './scrollbarStyles'
import { cn } from '../../utils/cn'

const pageEnterAnim = 'animate-[pageEnter_var(--duration-page)_var(--ease-page)_both]'

const pageContentChildAnims = cn(
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

const pageContentStagger = cn(
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

export const pageContentClass = cn(
  'animate-[pageFade_var(--duration-page)_var(--ease-page)_both]',
  pageContentChildAnims,
  pageContentStagger
)

export const pageContentTransitioningClass = cn(
  pageContentClass,
  'pointer-events-none opacity-70 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)]'
)

export const animateInClass = 'animate-[scaleIn_0.65s_var(--ease-page)]'

export const appLayoutClass = cn(
  'mx-auto flex min-h-dvh w-full flex-col overflow-x-clip bg-bg',
  'max-w-[480px] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-border)_40%,transparent),0_8px_40px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]',
  'lg:max-w-none lg:shadow-none'
)

export const appShellClass = cn(
  'flex min-h-dvh w-full flex-col',
  'lg:h-dvh lg:min-h-0 lg:flex-row lg:items-stretch lg:overflow-hidden'
)

export const appContentColumnClass = cn(
  'relative flex min-w-0 flex-1 flex-col min-h-dvh',
  'mx-auto w-full max-w-[480px] lg:h-dvh lg:min-h-0 lg:max-w-none'
)

export const appMainClass = cn(
  appScrollbarClass,
  'min-h-0 flex-1 overflow-y-auto p-[var(--space-page)] pb-[calc(5.75rem+var(--safe-bottom))]',
  'lg:mx-auto lg:w-full lg:max-w-[var(--content-max-width)] lg:pb-[var(--space-page)]'
)

/** Shared shell header bar metrics — main header + desktop sidebar profile. */
export const appShellHeaderBarClass = cn(
  'py-[0.65rem] pt-[max(0.65rem,env(safe-area-inset-top))]',
  'border-b border-[var(--header-border)] shadow-[var(--header-shadow)]',
  '[background:var(--header-bg)] [background-size:200%_200%] animate-[headerGlow_8s_ease_infinite]',
  'supports-[backdrop-filter]:backdrop-blur-[2px]',
  'lg:box-border lg:min-h-[var(--shell-header-height)]'
)

export const appHeaderClass = cn(
  'app-header sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 text-white',
  appShellHeaderBarClass
)

export const appHeaderWithBackClass = cn(
  '[&_[data-header-center]]:items-center',
  '[&_[data-header-title]]:text-center',
  '[&_[data-sync-badge]]:justify-center'
)

export const appHeaderCenterClass = 'flex min-w-0 flex-col items-start gap-[0.1rem]'

export const appHeaderTitleClass = cn(
  'w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-start text-[1.05rem] font-extrabold tracking-[-0.02em]',
  '[text-shadow:0_1px_3px_rgba(15,23,42,0.22)]'
)

export const headerIconBtnClass = cn(
  'flex h-touch-min w-touch-min flex-shrink-0 items-center justify-center rounded-full leading-none',
  'bg-white/15 ring-1 ring-white/10 transition-[background,transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
  'hover:bg-white/30 hover:ring-white/20 active:scale-90',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent'
)

export function headerIconBtnMenuClass(active?: boolean) {
  return cn(headerIconBtnClass, 'text-white', active && 'bg-white/30')
}

export const headerGridMenuClass = 'col-start-1 row-start-1'

export const headerGridCenterClass = 'col-start-2 row-start-1'

export const headerGridEndClass = 'col-start-3 row-start-1'

export const headerBackBtnClass = cn(headerIconBtnClass, headerGridEndClass, 'text-white')

export const headerIconSpacerClass = cn('h-touch-min w-touch-min flex-shrink-0', headerGridEndClass)

export * from './sidebarMenuStyles'

type SyncStatus = 'online' | 'syncing' | 'offline' | 'error'

export const syncStatusBadgeClass = cn(
  'inline-flex max-w-full items-center gap-[0.4rem] rounded-full px-[0.5rem] py-[0.15rem]',
  'bg-black/12 text-[0.75rem] font-semibold text-white ring-1 ring-white/18',
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
