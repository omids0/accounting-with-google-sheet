import { cn } from '../../utils/cn'

export const bottomNavClass = cn(
  'bottom-nav relative fixed bottom-0 left-1/2 z-20 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-[1fr_auto_1fr] items-stretch',
  'border-t border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))]',
  'bg-[var(--color-nav-bg)] px-1 pb-[calc(0.5rem+var(--safe-bottom))] pt-1',
  'shadow-[0_-8px_32px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
  'backdrop-blur-[18px] backdrop-saturate-150',
  'before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:content-[""]',
  'before:bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-primary)_40%,transparent),transparent)]'
)

export const bottomNavSideClass = 'flex min-w-0 items-stretch justify-around gap-0'

export const bottomNavCenterClass =
  'relative z-[2] flex items-end justify-center self-end px-0.5 min-[380px]:px-1'

export const bottomNavTabLabelClass =
  'max-w-full truncate text-[0.68rem] leading-tight min-[380px]:text-[0.72rem]'

export function bottomNavTabBtnClass(active?: boolean) {
  return cn(
    'relative flex min-h-touch-min min-w-0 max-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5',
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
  return cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-[13px] leading-none min-[380px]:h-10 min-[380px]:w-10 min-[380px]:rounded-[14px]',
    '[background:color-mix(in_srgb,var(--color-accent-soft)_78%,transparent)] text-muted',
    'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-surface)_65%,transparent)]',
    'transition-[transform,background,color,box-shadow] duration-[var(--duration-normal)]',
    !active &&
      'hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-accent-soft))] hover:text-primary-dark',
    active &&
      cn(
        'scale-[1.06] text-primary-dark motion-reduce:scale-100',
        '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_20%,var(--color-surface)),color-mix(in_srgb,var(--color-primary)_10%,var(--color-accent-soft)))]',
        'shadow-[0_4px_14px_color-mix(in_srgb,var(--color-primary)_22%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--color-surface)_70%,transparent)]',
        'ring-1 ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]'
      )
  )
}

export function bottomNavDashboardClass(active?: boolean) {
  return cn(
    'bottom-nav-fab relative mb-1 mt-[-2.2rem] flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-full text-white',
    'min-[380px]:mt-[-2.4rem] min-[380px]:h-[4.6rem] min-[380px]:w-[4.6rem] min-[380px]:gap-1',
    '[background:linear-gradient(145deg,var(--color-primary-dark)_0%,var(--color-primary)_45%,var(--color-primary-light)_100%)]',
    'shadow-[var(--nav-fab-shadow),0_0_0_4px_var(--nav-fab-ring)] min-[380px]:shadow-[var(--nav-fab-shadow),0_0_0_5px_var(--nav-fab-ring)]',
    'before:pointer-events-none before:absolute before:inset-[3px] before:rounded-full before:content-[""] before:[background:linear-gradient(145deg,rgba(255,255,255,0.2)_0%,transparent_55%)]',
    'touch-manipulation transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
    'hover:-translate-y-0.5 active:scale-[0.94] active:translate-y-0 motion-reduce:hover:translate-y-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-nav-bg)]',
    active &&
      cn(
        '[background:linear-gradient(145deg,#0a5c56_0%,var(--color-primary-dark)_50%,var(--color-primary)_100%)]',
        'shadow-[0_14px_36px_color-mix(in_srgb,var(--color-primary)_55%,transparent),0_6px_18px_rgba(15,118,110,0.35),0_0_0_4px_color-mix(in_srgb,var(--color-primary-light)_55%,var(--nav-fab-ring))]',
        'min-[380px]:shadow-[0_14px_36px_color-mix(in_srgb,var(--color-primary)_55%,transparent),0_6px_18px_rgba(15,118,110,0.35),0_0_0_5px_color-mix(in_srgb,var(--color-primary-light)_55%,var(--nav-fab-ring))]'
      )
  )
}

export const bottomNavDashboardIconClass = cn(
  'inline-flex items-center justify-center leading-none',
  '[&_svg]:h-[1.35rem] [&_svg]:w-[1.35rem] min-[380px]:[&_svg]:h-[1.625rem] min-[380px]:[&_svg]:w-[1.625rem]',
  '[&_svg]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
)

export const bottomNavDashboardLabelClass = cn(
  'text-[0.68rem] font-bold tracking-[-0.01em] text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.25)]',
  'min-[380px]:text-[0.72rem]'
)
