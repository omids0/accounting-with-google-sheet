import { scrollbarHiddenClass } from './scrollbarStyles'
import { cn } from '../../utils/cn'

export const appMenuBackdropClass = cn(
  'fixed inset-0 z-40 cursor-default border-none bg-[var(--color-overlay-light)]',
  'animate-[speed-dial-fade-in_var(--duration-fast)_var(--ease-out)] backdrop-blur-[5px]',
  'lg:hidden'
)

export const appMenuDrawerClass = cn(
  'fixed bottom-0 right-0 top-0 z-[41] flex w-[min(19rem,88vw)] flex-col overflow-hidden',
  'border-s border-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))]',
  '[background:linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))_0%,var(--color-surface)_32%,var(--color-surface)_100%)]',
  'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
  'shadow-[-10px_0_40px_color-mix(in_srgb,var(--color-primary)_14%,rgba(15,23,42,0.22))]',
  'animate-[app-menu-slide-in_var(--duration-normal)_var(--ease-out)]',
  'lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:max-h-dvh lg:w-[var(--sidebar-width)] lg:shrink-0 lg:self-start lg:animate-none lg:shadow-none lg:pb-0',
  'lg:border-s-0 lg:border-e lg:border-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))]'
)

export const appSidebarNavClass = cn(
  'hidden flex-col gap-[0.15rem] px-3 pb-1 lg:flex',
  '[&_.app-menu-divider]:my-[0.25rem]'
)

export const appMenuProfileClass = cn(
  'relative flex shrink-0 items-center gap-[0.85rem] overflow-hidden text-white',
  'border-b border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] px-[1.15rem] pb-[1.15rem] pt-[max(1rem,env(safe-area-inset-top))]',
  '[background:linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_52%,#2dd4bf_100%)]',
  '[background-size:200%_200%] animate-[headerGlow_8s_ease_infinite]',
  'after:pointer-events-none after:absolute after:inset-[-35%_-25%] after:animate-[heroShimmer_5s_ease-in-out_infinite] after:content-[""] after:[background:radial-gradient(circle,rgba(255,255,255,0.22),transparent_62%)]',
  'lg:z-30 lg:items-center lg:gap-3 lg:px-4 lg:pb-[0.65rem] lg:pt-[max(0.65rem,env(safe-area-inset-top))] lg:after:hidden',
  'lg:box-border lg:min-h-[var(--shell-header-height)]',
  'lg:border-[var(--header-border)] lg:shadow-[var(--header-shadow)]',
  'lg:[background:var(--header-bg)] lg:[background-size:200%_200%]',
  'lg:supports-[backdrop-filter]:backdrop-blur-[2px]'
)

export const appMenuScrollBodyClass = cn(
  scrollbarHiddenClass,
  'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain',
  '[-webkit-overflow-scrolling:touch]'
)

export const appMenuProfileInnerClass =
  'relative z-[1] flex min-w-0 flex-1 items-center gap-[0.85rem]'

export const appMenuAvatarClass = cn(
  'h-[3.35rem] w-[3.35rem] flex-shrink-0 rounded-full border-2 border-white/60 object-cover',
  'shadow-[0_4px_16px_rgba(0,0,0,0.22),0_0_0_3px_rgba(255,255,255,0.18)]',
  'lg:h-touch-min lg:w-touch-min lg:border lg:shadow-[0_2px_8px_rgba(0,0,0,0.18)]'
)

export const appMenuAvatarPlaceholderClass = cn(
  appMenuAvatarClass,
  'flex items-center justify-center bg-white/20'
)

export const appMenuProfileTextClass = 'min-w-0'

export const appMenuNameClass =
  'break-words text-base font-bold leading-[1.35] lg:truncate lg:text-[0.94rem] lg:leading-tight'

export const appMenuGreetingClass = 'mt-[0.2rem] text-[0.78rem] font-medium text-white/88 lg:hidden'

export const appMenuItemsClass = cn(
  'flex flex-col gap-[0.2rem] px-3 py-[0.75rem]',
  '[&>.app-menu-promo]:animate-[menuItemIn_0.38s_var(--ease-page)_both] [&>.app-menu-promo]:[animation-delay:0.02s]',
  '[&>.app-menu-group]:animate-[menuItemIn_0.38s_var(--ease-page)_both]',
  '[&>.app-menu-group:nth-child(2)]:[animation-delay:0.06s]',
  '[&>.app-menu-group:nth-child(3)]:[animation-delay:0.1s]',
  '[&>.app-menu-group:nth-child(4)]:[animation-delay:0.14s]',
  '[&>.app-menu-item:not(.app-menu-promo)]:animate-[menuItemIn_0.38s_var(--ease-page)_both]',
  '[&>.app-menu-item:not(.app-menu-promo):nth-of-type(2)]:[animation-delay:0.18s]',
  '[&>.app-menu-item:not(.app-menu-promo):nth-of-type(3)]:[animation-delay:0.22s]',
  '[&>.app-menu-divider]:animate-[menuItemIn_0.38s_var(--ease-page)_both] [&>.app-menu-divider]:[animation-delay:0.16s]'
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

export function appMenuPromoItemClass(active?: boolean) {
  return cn(
    'app-menu-item app-menu-promo flex w-full items-center gap-3 rounded-xl text-right transition-[background,color,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    'min-h-touch-min border px-[0.85rem] py-[0.75rem]',
    'border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]',
    '[background:linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_16%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_88%,var(--color-surface)))]',
    'shadow-[0_4px_16px_color-mix(in_srgb,var(--color-primary)_14%,transparent),inset_0_1px_0_rgba(255,255,255,0.55)]',
    active &&
      cn(
        'scale-[1.01] border-[color-mix(in_srgb,var(--color-primary)_42%,var(--color-border))]',
        '[background:linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_24%,var(--color-surface)),color-mix(in_srgb,var(--color-primary)_8%,var(--color-accent-soft)))]',
        'shadow-[0_6px_20px_color-mix(in_srgb,var(--color-primary)_20%,transparent),inset_-3px_0_0_var(--color-primary),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]'
      ),
    !active &&
      'hover:-translate-y-0.5 hover:shadow-[0_6px_18px_color-mix(in_srgb,var(--color-primary)_18%,transparent)] active:scale-[0.99]'
  )
}

export function appMenuPromoIconClass(active?: boolean) {
  return cn(
    appMenuItemIconClass(active),
    'text-primary-dark',
    '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_30%,var(--color-surface)),color-mix(in_srgb,var(--color-primary)_12%,var(--color-accent-soft)))]',
    !active &&
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_3px_10px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]'
  )
}

export const appMenuPromoTextClass =
  'flex min-w-0 flex-1 flex-col items-start gap-[0.12rem] text-right'

export const appMenuPromoLabelClass =
  'text-[0.96rem] font-extrabold tracking-[-0.01em] text-primary-dark'

export const appMenuPromoHintClass = 'text-[0.72rem] font-semibold text-muted'

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
