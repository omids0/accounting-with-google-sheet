import { cn } from '../../utils/cn'

export const bottomNavClass = cn(
  'bottom-nav relative fixed bottom-0 left-1/2 z-20 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-[1fr_auto_1fr] items-stretch',
  'border-t border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))]',
  // Near-opaque bg, no backdrop blur: blurring the scrolling page under an
  // always-visible fixed bar re-rendered it on every scroll frame.
  'bg-[var(--color-nav-bg)] px-1 pb-[calc(0.5rem+var(--safe-bottom))] pt-1',
  'shadow-[0_-8px_32px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
  'before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:content-[""]',
  'before:bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-primary)_40%,transparent),transparent)]',
  'md:hidden'
)

export const bottomNavSideClass = 'flex min-w-0 items-stretch justify-around gap-0'

export const bottomNavCenterClass =
  'relative z-[2] flex items-end justify-center self-end px-0.5 min-[380px]:px-1'

export const bottomNavTabLabelClass =
  // No truncation: on 320px phones a cut label («کیف پ…») is worse than a smaller one.
  'max-w-full whitespace-nowrap text-[0.6rem] leading-tight tracking-[-0.01em] min-[360px]:text-[0.68rem] min-[380px]:text-[0.72rem]'

export function bottomNavTabBtnClass(active?: boolean) {
  return cn(
    'relative flex min-h-touch-min min-w-0 max-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-0 py-1.5 min-[360px]:px-0.5',
    'min-[380px]:max-w-[4.75rem] min-[380px]:gap-1 min-[380px]:px-1 min-[380px]:py-2',
    'touch-manipulation text-[0.68rem] font-semibold text-muted transition-[color,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
    'min-[380px]:text-[0.72rem]',
    'rounded-xl active:enabled:scale-[0.94] motion-reduce:active:scale-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-nav-bg)]',
    active &&
      cn(
        'font-bold text-primary-dark',
        'before:absolute before:inset-x-[16%] before:top-0 before:h-[3px] before:rounded-b before:bg-primary before:content-[""]',
        'before:animate-[navIndicator_0.3s_var(--ease-out)] motion-reduce:before:animate-none'
      ),
    !active && 'hover:text-primary'
  )
}

export function bottomNavTabIconClass(active?: boolean) {
  // Bare icon, no box: color plus the tab's top indicator line mark the active tab.
  return cn(
    'inline-flex h-7 w-7 items-center justify-center leading-none',
    'transition-colors duration-[var(--duration-normal)]',
    active && 'text-primary'
  )
}

export function bottomNavDashboardClass(active?: boolean) {
  return cn(
    'bottom-nav-fab relative mb-1 mt-[-2.2rem] flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-full text-on-primary',
    'min-[380px]:mt-[-2.4rem] min-[380px]:h-[4.6rem] min-[380px]:w-[4.6rem] min-[380px]:gap-1',
    '[background:var(--nav-fab-bg)]',
    'shadow-[var(--nav-fab-shadow),0_0_0_4px_var(--nav-fab-ring)] min-[380px]:shadow-[var(--nav-fab-shadow),0_0_0_5px_var(--nav-fab-ring)]',
    'before:pointer-events-none before:absolute before:inset-[3px] before:rounded-full before:content-[""] before:[background:linear-gradient(145deg,rgba(255,255,255,0.2)_0%,transparent_55%)]',
    'touch-manipulation transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
    'hover:-translate-y-0.5 active:scale-[0.94] active:translate-y-0 motion-reduce:hover:translate-y-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-nav-bg)]',
    active && '[background:var(--nav-fab-bg-active)]'
  )
}

export const bottomNavDashboardIconClass = cn(
  'inline-flex items-center justify-center leading-none',
  '[&_svg]:h-[1.35rem] [&_svg]:w-[1.35rem] min-[380px]:[&_svg]:h-[1.625rem] min-[380px]:[&_svg]:w-[1.625rem]',
  '[&_svg]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
)

export const bottomNavDashboardLabelClass = cn(
  'text-[0.68rem] font-bold tracking-[-0.01em] text-on-primary [text-shadow:0_1px_2px_rgba(15,23,42,0.25)]',
  'min-[380px]:text-[0.72rem]'
)
