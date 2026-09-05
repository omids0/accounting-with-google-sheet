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
  'mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-x-clip bg-bg shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-border)_40%,transparent),0_8px_40px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]'
)

export const appMainClass = cn(
  'flex-1 overflow-y-auto p-[var(--space-page)] pb-[calc(5.75rem+var(--safe-bottom))]'
)

export const appHeaderClass = cn(
  'app-header sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-[0.65rem] text-white',
  'pt-[max(0.65rem,env(safe-area-inset-top))]',
  'border-b border-[var(--header-border)] shadow-[var(--header-shadow)]',
  '[background:var(--header-bg)] [background-size:200%_200%] animate-[headerGlow_8s_ease_infinite]',
  'supports-[backdrop-filter]:backdrop-blur-[2px]'
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

export const headerBackBtnClass = cn(headerIconBtnClass, 'text-white')

export const headerIconSpacerClass = 'h-touch-min w-touch-min flex-shrink-0'

export const appMenuBackdropClass = cn(
  'fixed inset-0 z-40 cursor-default border-none bg-[var(--color-overlay-light)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)] backdrop-blur-[5px]'
)

export const appMenuDrawerClass = cn(
  'fixed bottom-0 right-0 top-0 z-[41] flex w-[min(19rem,88vw)] flex-col overflow-hidden',
  'border-s border-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))]',
  '[background:linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))_0%,var(--color-surface)_32%,var(--color-surface)_100%)]',
  'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
  'shadow-[-10px_0_40px_color-mix(in_srgb,var(--color-primary)_14%,rgba(15,23,42,0.22))]',
  'animate-[app-menu-slide-in_var(--duration-normal)_var(--ease-out)]'
)

export const appMenuProfileClass = cn(
  'relative flex items-center gap-[0.85rem] overflow-hidden border-b border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] px-[1.15rem] pb-[1.15rem] pt-[max(1rem,env(safe-area-inset-top))] text-white',
  '[background:linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_52%,#2dd4bf_100%)]',
  '[background-size:200%_200%] animate-[headerGlow_8s_ease_infinite]',
  'after:pointer-events-none after:absolute after:inset-[-35%_-25%] after:animate-[heroShimmer_5s_ease-in-out_infinite] after:content-[""] after:[background:radial-gradient(circle,rgba(255,255,255,0.22),transparent_62%)]'
)

export const appMenuProfileInnerClass =
  'relative z-[1] flex min-w-0 flex-1 items-center gap-[0.85rem]'

export const appMenuAvatarClass = cn(
  'h-[3.35rem] w-[3.35rem] flex-shrink-0 rounded-full border-2 border-white/60 object-cover',
  'shadow-[0_4px_16px_rgba(0,0,0,0.22),0_0_0_3px_rgba(255,255,255,0.18)]'
)

export const appMenuAvatarPlaceholderClass = cn(
  appMenuAvatarClass,
  'flex items-center justify-center bg-white/20'
)

export const appMenuProfileTextClass = 'min-w-0'

export const appMenuNameClass = 'break-words text-base font-bold leading-[1.35]'

export const appMenuGreetingClass = 'mt-[0.2rem] text-[0.78rem] font-medium text-white/88'

export const appMenuItemsClass = cn(
  'flex min-h-0 flex-1 flex-col gap-[0.2rem] overflow-y-auto overscroll-contain px-3 py-[0.75rem]',
  '[-webkit-overflow-scrolling:touch]',
  '[&>.app-menu-group]:animate-[menuItemIn_0.38s_var(--ease-page)_both]',
  '[&>.app-menu-group:nth-child(1)]:[animation-delay:0.04s]',
  '[&>.app-menu-group:nth-child(2)]:[animation-delay:0.08s]',
  '[&>.app-menu-group:nth-child(3)]:[animation-delay:0.12s]',
  '[&>.app-menu-item]:animate-[menuItemIn_0.38s_var(--ease-page)_both]',
  '[&>.app-menu-item:nth-of-type(1)]:[animation-delay:0.16s]',
  '[&>.app-menu-item:nth-of-type(2)]:[animation-delay:0.2s]',
  '[&>.app-menu-divider]:animate-[menuItemIn_0.38s_var(--ease-page)_both] [&>.app-menu-divider]:[animation-delay:0.14s]'
)

export const appMenuGroupClass = 'app-menu-group flex flex-col gap-[0.15rem]'

export const appMenuDividerClass =
  'app-menu-divider my-[0.35rem] h-px border-none bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-primary)_18%,var(--color-border)),transparent)]'

export const appMenuFooterClass = cn(
  'app-menu-footer shrink-0 border-t border-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-border))] px-4 py-3 text-center',
  '[background:linear-gradient(180deg,transparent,color-mix(in_srgb,var(--color-primary)_4%,var(--color-surface)))]'
)

export const appMenuFooterTextClass = 'm-0 text-[0.72rem] font-semibold text-muted'

export function appMenuItemClass(active?: boolean, variant?: 'default' | 'parent' | 'sub') {
  return cn(
    'app-menu-item flex w-full items-center gap-3 rounded-xl text-right font-semibold text-text transition-[background,color,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    variant === 'parent' && 'justify-start',
    variant === 'sub'
      ? 'min-h-[2.65rem] px-[0.85rem] py-[0.65rem] text-[0.86rem]'
      : 'min-h-touch-min px-[0.85rem] py-[0.7rem] text-[0.94rem]',
    active &&
      cn(
        'text-primary-dark',
        '[background:linear-gradient(90deg,color-mix(in_srgb,var(--color-primary)_16%,transparent),color-mix(in_srgb,var(--color-primary)_5%,transparent))]',
        'shadow-[inset_-3px_0_0_var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]'
      ),
    !active && 'hover:bg-accent-soft active:scale-[0.99]'
  )
}

export function appMenuItemIconClass(active?: boolean) {
  return cn(
    'flex h-[2.35rem] w-[2.35rem] flex-shrink-0 items-center justify-center rounded-[13px] text-primary',
    '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_90%,var(--color-surface)))]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_8px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]',
    'transition-[transform,background,color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    active &&
      cn(
        'scale-[1.04] text-primary-dark',
        '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_24%,var(--color-surface)),color-mix(in_srgb,var(--color-primary)_10%,var(--color-accent-soft)))]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_12px_color-mix(in_srgb,var(--color-primary)_16%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]'
      )
  )
}

export const appMenuItemLabelClass = 'flex-1 text-right'

export function appMenuChevronClass(expanded?: boolean) {
  return cn(
    'flex items-center justify-center text-muted transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    expanded && 'rotate-180'
  )
}

export const appMenuSubmenuClass = cn(
  'flex flex-col gap-[0.12rem] border-s-2 border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] ps-[1.1rem]',
  'animate-[submenuReveal_0.28s_var(--ease-out)_both]'
)

export const appMenuSubmenuLabelClass = cn(
  'px-[0.85rem] pb-[0.15rem] pt-[0.55rem] text-[0.7rem] font-extrabold tracking-[0.04em] text-muted',
  'before:me-1.5 before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] before:content-[""]'
)

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
