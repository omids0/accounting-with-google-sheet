import { cn } from '../../utils/cn'

export const loginPageClass = cn(
  'login-page flex min-h-dvh items-center justify-center p-6',
  '[background:linear-gradient(160deg,var(--color-bg)_0%,var(--color-accent-soft)_50%,var(--color-accent-mid)_100%)]',
  '[background-size:200%_200%] animate-[headerGlow_12s_ease_infinite]'
)

export const loginCardClass = cn(
  'w-full max-w-[400px] rounded-[20px] border border-border bg-surface p-8 px-6 shadow-lg'
)

export const loginLogoClass = 'mb-6 text-center'

export const loginLogoIconClass = cn(
  'mx-auto mb-[0.85rem] inline-flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl text-primary',
  'animate-[float_3s_ease-in-out_infinite]',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_90%,var(--color-surface)))]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_6px_18px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]',
  '[&_svg]:h-[1.85rem] [&_svg]:w-[1.85rem]'
)

export const loginLogoTitleClass =
  'text-2xl font-extrabold tracking-[-0.02em] text-[var(--color-primary-dark)]'

export const loginLogoSubtitleClass = 'text-[0.85rem] leading-[1.6] text-muted'

export const loginFeaturesClass = 'mb-5 flex list-none flex-col gap-[0.55rem] p-0'

export const loginFeatureClass = cn(
  'flex items-center gap-[0.65rem] rounded-sm border border-border bg-bg p-[0.55rem] px-3',
  'text-[0.82rem] font-semibold leading-[1.45] text-text'
)

export const loginFeatureIconClass = cn(
  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-primary',
  '[background:color-mix(in_srgb,var(--color-primary)_12%,transparent)]'
)

export const loginFooterNoteClass = 'mt-4 text-center text-xs leading-[1.55] text-muted'

export const loginTrustBadgeClass = cn(
  'mt-[0.85rem] inline-flex items-center justify-center gap-[0.35rem] rounded-full px-3 py-[0.35rem]',
  'text-[0.7rem] font-semibold text-[var(--color-primary-dark)]',
  '[background:color-mix(in_srgb,var(--color-primary)_8%,transparent)]',
  'border border-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]'
)

export const googleSignInBtnClass = cn(
  '!min-h-touch-min !border-[1.5px] !border-border !bg-surface !text-text',
  'hover:enabled:!-translate-y-px hover:enabled:!border-[var(--color-primary-light)] hover:enabled:!bg-bg',
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]'
)

export const unlockCardClass = '[&_form]:flex [&_form]:flex-col [&_form]:gap-3'

export const unlockPinInputClass = 'text-center text-xl tracking-[0.35em] tabular-nums'

export const unlockBiometricBtnClass = 'mt-3 inline-flex w-full items-center justify-center gap-2'

export const unlockErrorClass = 'm-0'

export const appLoadingClass = 'flex min-h-dvh items-center justify-center bg-white'

export const appLoadingDotsClass = 'flex items-center gap-1.5'

export const appLoadingDotClass =
  'h-2 w-2 rounded-full bg-primary animate-[loadingDotBlink_1.2s_ease-in-out_infinite]'

export const appLoadingDotDelayClasses = [
  '[animation-delay:0s]',
  '[animation-delay:0.2s]',
  '[animation-delay:0.4s]'
] as const
