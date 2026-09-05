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
  '[&>*>*:nth-child(1)]:[animation-delay:0.08s]',
  '[&>*>*:nth-child(2)]:[animation-delay:0.16s]',
  '[&>*>*:nth-child(3)]:[animation-delay:0.24s]',
  '[&>*>*:nth-child(4)]:[animation-delay:0.32s]',
  '[&>*>*:nth-child(5)]:[animation-delay:0.4s]',
  '[&>*>*:nth-child(6)]:[animation-delay:0.48s]',
  '[&>*>*:nth-child(7)]:[animation-delay:0.56s]',
  '[&>*>*:nth-child(8)]:[animation-delay:0.64s]',
  '[&>*>*:nth-child(9)]:[animation-delay:0.72s]',
  '[&>*>*:nth-child(10)]:[animation-delay:0.8s]'
)

export const pageContentClass = cn(
  'animate-[pageFade_var(--duration-page)_var(--ease-page)_both]',
  pageContentChildAnims,
  pageContentStagger
)

export const animateInClass = 'animate-[scaleIn_0.65s_var(--ease-page)]'

export const appLayoutClass = cn(
  'mx-auto flex min-h-dvh max-w-[480px] flex-col bg-surface shadow-lg'
)

export const appMainClass = cn(
  'flex-1 overflow-y-auto p-[var(--space-page)] pb-[calc(5.75rem+var(--safe-bottom))]'
)

export const appHeaderClass = cn(
  'sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-[0.65rem] text-white',
  'pt-[max(0.65rem,env(safe-area-inset-top))]',
  '[background:linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_50%,#2dd4bf_100%)]',
  '[background-size:200%_200%] animate-[headerGlow_8s_ease_infinite]'
)

export const appHeaderWithBackClass = cn(
  '[&_[data-header-center]]:items-center [&_[data-header-title]]:text-center'
)

export const appHeaderCenterClass = 'flex min-w-0 flex-col items-start gap-[0.1rem]'

export const appHeaderTitleClass =
  'w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-start text-[1.05rem] font-extrabold tracking-[-0.02em]'

export const headerIconBtnClass = cn(
  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full leading-none',
  'bg-white/15 transition-[background,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
  'hover:bg-white/30 active:scale-90'
)

export function headerIconBtnMenuClass(active?: boolean) {
  return cn(headerIconBtnClass, 'text-white', active && 'bg-white/30')
}

export const headerBackBtnClass = cn(headerIconBtnClass, 'text-white')

export const headerIconSpacerClass = 'h-9 w-9 flex-shrink-0'

export const bottomNavClass = cn(
  'fixed bottom-0 left-1/2 z-20 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-[1fr_auto_1fr] items-stretch',
  'border-t border-border bg-[var(--color-nav-bg)] px-1 pb-[calc(0.45rem+var(--safe-bottom))]',
  'shadow-[0_-4px_24px_rgba(15,118,110,0.08)] backdrop-blur-[14px]'
)

export const bottomNavSideClass = 'flex min-w-0 items-stretch justify-around'

export const bottomNavCenterClass =
  'relative z-[2] flex items-end justify-center self-end px-[0.15rem]'

export function bottomNavTabBtnClass(active?: boolean) {
  return cn(
    'relative flex min-w-0 max-w-[4.5rem] flex-1 flex-col items-center gap-[0.15rem] px-[0.2rem] py-[0.65rem] pb-[0.4rem] pt-[0.65rem]',
    'text-[0.62rem] font-semibold text-muted transition-[color,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
    'justify-start self-stretch active:enabled:scale-[0.92]',
    active &&
      cn(
        'text-primary before:absolute before:left-[18%] before:right-[18%] before:top-0 before:h-[3px]',
        'before:rounded-b before:bg-primary before:content-[""]',
        'before:animate-[navIndicator_0.3s_var(--ease-out)]'
      )
  )
}

export function bottomNavTabIconClass(active?: boolean) {
  return cn(
    'inline-flex h-[2.4rem] w-[2.4rem] items-center justify-center rounded-[13px] leading-none',
    '[background:color-mix(in_srgb,var(--color-accent-soft)_72%,transparent)] text-muted',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-[transform,background,color,box-shadow] duration-[var(--duration-normal)]',
    active &&
      cn(
        'scale-[1.06] text-primary',
        '[background:color-mix(in_srgb,var(--color-primary)_16%,var(--color-surface))]',
        'shadow-[0_4px_14px_color-mix(in_srgb,var(--color-primary)_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.45)]'
      )
  )
}

export function bottomNavDashboardClass(active?: boolean) {
  return cn(
    'mb-[0.1rem] mt-[-2.35rem] flex h-[4.55rem] w-[4.55rem] flex-col items-center justify-center gap-[0.15rem] rounded-full text-white',
    '[background:linear-gradient(145deg,var(--color-primary-dark)_0%,var(--color-primary)_45%,var(--color-primary-light)_100%)]',
    'shadow-[0_10px_28px_rgba(15,118,110,0.48),0_4px_12px_rgba(15,118,110,0.28),0_0_0_5px_rgba(255,255,255,0.98)]',
    'transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
    'hover:-translate-y-0.5 active:scale-[0.94] active:translate-y-0',
    active &&
      cn(
        '[background:linear-gradient(145deg,#0a5c56_0%,var(--color-primary-dark)_50%,var(--color-primary)_100%)]',
        'shadow-[0_14px_36px_rgba(15,118,110,0.58),0_6px_18px_rgba(15,118,110,0.35),0_0_0_5px_rgba(153,246,228,0.65)]'
      )
  )
}

export const bottomNavDashboardIconClass = 'inline-flex items-center justify-center leading-none'

export const bottomNavDashboardLabelClass = 'text-[0.58rem] font-bold tracking-[-0.02em] text-white'

export const appMenuBackdropClass = cn(
  'fixed inset-0 z-40 cursor-default border-none bg-[var(--color-overlay-light)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)]'
)

export const appMenuDrawerClass = cn(
  'fixed bottom-0 right-0 top-0 z-[41] flex w-[min(18.5rem,85vw)] flex-col overflow-hidden',
  'border-l border-border bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))]',
  'shadow-[-8px_0_32px_rgba(15,23,42,0.18)] animate-[app-menu-slide-in_var(--duration-normal)_var(--ease-out)]'
)

export const appMenuProfileClass = cn(
  'flex items-center gap-[0.85rem] border-b border-border px-[1.15rem] pb-[1.15rem] pt-[max(1rem,env(safe-area-inset-top))] text-white',
  '[background:linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_100%)]'
)

export const appMenuAvatarClass =
  'h-[3.25rem] w-[3.25rem] flex-shrink-0 rounded-full border-2 border-white/55 object-cover shadow-[0_4px_12px_rgba(0,0,0,0.18)]'

export const appMenuAvatarPlaceholderClass = cn(
  appMenuAvatarClass,
  'flex items-center justify-center bg-white/20'
)

export const appMenuProfileTextClass = 'min-w-0'

export const appMenuNameClass = 'break-words text-base font-bold leading-[1.35]'

export const appMenuGreetingClass = 'mt-[0.15rem] text-[0.78rem] opacity-85'

export const appMenuItemsClass =
  'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-[0.65rem]'

export const appMenuGroupClass = 'flex flex-col gap-[0.15rem]'

export function appMenuItemClass(active?: boolean, variant?: 'default' | 'parent' | 'sub') {
  return cn(
    'flex w-full items-center gap-3 rounded-sm text-right font-semibold text-text transition-[background,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    variant === 'parent' && 'justify-start',
    variant === 'sub'
      ? 'px-[0.85rem] py-[0.6rem] text-[0.88rem]'
      : 'px-[0.85rem] py-3 text-[0.95rem]',
    active &&
      'text-primary-dark [background:color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
    !active && 'hover:bg-accent-soft'
  )
}

export function appMenuItemIconClass(active?: boolean) {
  return cn(
    'flex h-[2.15rem] w-[2.15rem] flex-shrink-0 items-center justify-center rounded-xl text-primary',
    '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_90%,var(--color-surface)))]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_8px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]',
    active &&
      cn(
        'text-primary-dark',
        '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_22%,var(--color-surface)),color-mix(in_srgb,var(--color-primary)_10%,var(--color-accent-soft)))]'
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

export const appMenuSubmenuClass = 'flex flex-col gap-[0.1rem] ps-[1.35rem]'

export const appMenuSubmenuLabelClass =
  'px-[0.85rem] pb-[0.2rem] pt-[0.55rem] text-[0.72rem] font-bold text-muted'

type SyncStatus = 'online' | 'syncing' | 'offline' | 'error'

export const syncStatusBadgeClass =
  'inline-flex max-w-full items-center gap-[0.35rem] text-[0.68rem] font-semibold opacity-92'

export function syncStatusDotClass(status: SyncStatus) {
  return cn(
    'h-[0.45rem] w-[0.45rem] flex-shrink-0 rounded-full bg-white/85',
    status === 'online' && 'bg-[#86efac] shadow-[0_0_0_2px_rgba(134,239,172,0.35)]',
    status === 'syncing' && 'animate-[syncPulse_1.2s_ease-in-out_infinite] bg-[#fde68a]',
    (status === 'offline' || status === 'error') && 'bg-[#fca5a5]'
  )
}

export const syncStatusLabelClass = 'overflow-hidden text-ellipsis whitespace-nowrap'

export const fabContainerClass = cn(
  'pointer-events-none fixed bottom-[calc(5.75rem+var(--safe-bottom)+5px)] left-1/2 z-[25] flex w-full max-w-[480px] -translate-x-1/2 justify-start px-5'
)

export const speedDialContainerClass = 'z-[25]'

export const speedDialBackdropClass = cn(
  'fixed inset-0 z-[24] cursor-default border-none bg-[rgba(15,23,42,0.28)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)]'
)

export const speedDialClass = 'relative flex flex-col items-start'

export const speedDialActionsClass = 'mb-[0.65rem] flex flex-col-reverse items-start gap-[0.65rem]'

export function speedDialActionWrapClass(open?: boolean) {
  return cn(
    'flex items-center opacity-0 [transform:translateY(10px)_scale(0.85)] pointer-events-none',
    'transition-[opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    '[transition-delay:calc(var(--action-index)*35ms)]',
    open && 'pointer-events-auto translate-y-0 scale-100 opacity-100'
  )
}

export const speedDialActionClass = cn(
  'flex h-[2.65rem] w-[2.65rem] items-center justify-center rounded-full border border-[rgba(15,118,110,0.18)]',
  'bg-surface text-primary shadow-[0_3px_12px_rgba(15,23,42,0.12)]',
  'transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
  'hover:enabled:shadow-[0_5px_16px_rgba(15,23,42,0.16)] active:enabled:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-45'
)

export const speedDialActionIncomeClass = cn(
  speedDialActionClass,
  'border-[var(--color-income-border)] bg-[var(--color-income-bg)] text-[var(--color-income)]'
)

export const speedDialActionExpenseClass = cn(
  speedDialActionClass,
  'border-[var(--color-expense-border)] bg-[var(--color-expense-bg)] text-[var(--color-expense)]'
)

export const speedDialActionIconClass =
  'flex h-[1.125rem] w-[1.125rem] items-center justify-center leading-none [&_svg]:h-full [&_svg]:w-full'

export const fabClass = cn(
  'pointer-events-auto flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-primary leading-none text-white opacity-80',
  'shadow-[0_4px_16px_rgba(15,118,110,0.35)] transition-[transform,box-shadow] duration-[var(--duration-fast)]',
  'hover:shadow-[0_6px_20px_rgba(15,118,110,0.45)] active:scale-[0.92]'
)

export function speedDialTriggerClass(open?: boolean) {
  return cn(fabClass, open && 'opacity-80')
}

export function speedDialTriggerIconClass(open?: boolean) {
  return cn(
    'flex h-[1.35rem] w-[1.35rem] items-center justify-center leading-none transition-transform duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
    '[&_svg]:h-full [&_svg]:w-full',
    open && 'rotate-90'
  )
}

export const speedDialTypeIconClass = 'text-[1.25rem] font-bold leading-none'

export const speedDialTypeIconIncomeClass = cn(speedDialTypeIconClass, 'text-income')

export const speedDialTypeIconExpenseClass = cn(speedDialTypeIconClass, 'text-expense')
