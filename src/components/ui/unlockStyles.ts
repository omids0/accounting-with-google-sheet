import { cn } from '../../utils/cn'

export const unlockPageClass = cn(
  'relative flex min-h-dvh items-center justify-center overflow-hidden p-5',
  '[background:radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_55%),linear-gradient(165deg,var(--color-bg)_0%,color-mix(in_srgb,var(--color-accent-soft)_70%,var(--color-bg))_45%,color-mix(in_srgb,var(--color-accent-mid)_55%,var(--color-bg))_100%)]'
)

export const unlockBackdropOrbPrimaryClass = cn(
  'pointer-events-none absolute -top-24 end-[-4rem] h-56 w-56 rounded-full opacity-70 blur-3xl',
  '[background:radial-gradient(circle,color-mix(in_srgb,var(--color-primary-light)_35%,transparent)_0%,transparent_70%)]',
  'animate-[float_8s_ease-in-out_infinite]'
)

export const unlockBackdropOrbAccentClass = cn(
  'pointer-events-none absolute -bottom-20 start-[-3rem] h-48 w-48 rounded-full opacity-60 blur-3xl',
  '[background:radial-gradient(circle,color-mix(in_srgb,var(--color-accent-mid)_45%,transparent)_0%,transparent_70%)]',
  'animate-[float_10s_ease-in-out_infinite_reverse]'
)

export const unlockCardClass = cn(
  'relative z-[1] w-full max-w-[420px] overflow-hidden rounded-[24px] border',
  'border-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))]',
  'bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-0 shadow-[0_24px_60px_color-mix(in_srgb,var(--color-primary)_14%,transparent),0_2px_8px_color-mix(in_srgb,var(--color-text)_6%,transparent)]',
  'backdrop-blur-[18px]'
)

export const unlockCardHeroClass = cn(
  'relative overflow-hidden px-6 pb-5 pt-7 text-center',
  '[background:linear-gradient(155deg,color-mix(in_srgb,var(--color-primary)_11%,var(--color-surface))_0%,color-mix(in_srgb,var(--color-accent-soft)_65%,var(--color-surface))_100%)]',
  'before:pointer-events-none before:absolute before:-top-10 before:end-[-2rem] before:h-28 before:w-28 before:rounded-full before:bg-[color-mix(in_srgb,var(--color-primary-light)_22%,transparent)] before:blur-2xl before:content-[""]',
  'after:pointer-events-none after:absolute after:-bottom-8 after:start-[-1.5rem] after:h-24 after:w-24 after:rounded-full after:bg-[color-mix(in_srgb,var(--color-accent-mid)_30%,transparent)] after:blur-2xl after:content-[""]'
)

export const unlockIconWrapClass = cn(
  'relative z-[1] mx-auto mb-4 inline-flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[18px] text-primary',
  'animate-[float_4s_ease-in-out_infinite]',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_18%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_85%,var(--color-surface)))]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_28px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]',
  '[&_svg]:h-8 [&_svg]:w-8'
)

export const unlockTitleClass =
  'relative z-[1] m-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-[var(--color-primary-dark)]'

export const unlockSubtitleClass = 'relative z-[1] mt-2 text-[0.84rem] leading-[1.65] text-muted'

export const unlockGreetingClass =
  'relative z-[1] mt-1 text-[0.9rem] font-semibold text-[var(--color-primary-dark)]'

export const unlockBodyClass = 'flex flex-col gap-4 px-6 pb-6 pt-1'

export const unlockPinSectionClass = 'flex flex-col items-center gap-3 [direction:ltr]'

export const unlockPinLabelClass =
  'm-0 w-full text-center text-[0.76rem] font-bold tracking-[0.02em] text-[var(--form-label-color)] [direction:rtl]'

export const unlockPinCellsClass = 'flex items-center justify-center gap-3 [direction:ltr]'

export function unlockPinCellClass({
  filled,
  active,
  error
}: {
  filled?: boolean
  active?: boolean
  error?: boolean
}) {
  return cn(
    'flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[14px] border-[1.5px] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    error
      ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-danger)_12%,transparent)]'
      : active
      ? 'border-primary bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))] shadow-[var(--form-input-focus-shadow)]'
      : filled
      ? 'border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))]'
      : 'border-[var(--form-input-border)] bg-[var(--form-input-bg)] shadow-[var(--form-input-shadow)]'
  )
}

export const unlockPinDotClass = cn(
  'h-2.5 w-2.5 rounded-full bg-primary',
  'animate-[slideDown_var(--duration-fast)_var(--ease-out)]'
)

export const unlockHiddenInputClass = 'sr-only'

export const unlockErrorClass = 'm-0 w-full text-center text-[0.8rem]'

export const unlockActionsClass = 'flex flex-col gap-2.5'

export const unlockPrimaryBtnClass = cn(
  '!rounded-[14px] !py-[0.85rem] !text-[0.95rem] !shadow-[0_8px_22px_color-mix(in_srgb,var(--color-primary)_28%,transparent)]'
)

export const unlockBiometricBtnClass = cn(
  '!rounded-[14px] !border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] !bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))] !py-[0.8rem]',
  'hover:enabled:!border-primary hover:enabled:!bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]'
)

export const unlockDividerClass = 'flex items-center gap-3 text-[0.72rem] font-semibold text-muted'

export const unlockDividerLineClass =
  'h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_85%,transparent)]'

export const unlockFooterClass = 'mt-1 text-center'

export const unlockTrustBadgeClass = cn(
  'inline-flex items-center justify-center gap-[0.4rem] rounded-full px-3 py-[0.4rem]',
  'text-[0.7rem] font-semibold text-[var(--color-primary-dark)]',
  '[background:color-mix(in_srgb,var(--color-primary)_7%,transparent)]',
  'border border-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]'
)
