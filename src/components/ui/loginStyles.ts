import { cx } from '../../utils/cn'

export const loginPageClass = cx(
  // Safe-area aware like the onboarding page: the card never sits under the notch or home bar.
  'login-page flex min-h-dvh items-center justify-center px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-[max(1.5rem,var(--safe-top))]',
  // White, not tinted by the palette: before sign-in no account (so no palette) is known. One faint
  // brand-teal glow above the card gives it life. Static: an animated background repaints every frame.
  'bg-surface [background-image:radial-gradient(60rem_26rem_at_50%_-9rem,rgba(15,118,110,0.09),transparent_70%)]',
  '[[data-theme=dark]_&]:bg-bg [[data-theme=dark]_&]:[background-image:radial-gradient(60rem_26rem_at_50%_-9rem,rgba(15,118,110,0.14),transparent_70%)]'
)

export const loginCardClass = cx(
  'w-full max-w-[400px] rounded-[24px] border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-surface p-8 px-6',
  'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-16px_rgba(15,23,42,0.14)] [[data-theme=dark]_&]:shadow-lg',
  'md:max-w-[440px] md:p-10'
)

export const loginLogoClass = 'mb-6 text-center'

/** A full-width action under the card's alert (shared account that cannot be opened). */
export const loginFullWidthActionClass = 'mt-3 w-full'

/** The same fixed brand-teal tile as the boot splash, so the splash flows into the sign-in without a jump. */
export const loginLogoIconClass = cx(
  'mx-auto mb-[0.85rem] inline-flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-[1.1rem] bg-[#0f766e] text-white',
  'animate-[float_3s_ease-in-out_infinite]',
  'shadow-[0_10px_28px_rgba(15,118,110,0.28)]',
  '[&_svg]:h-[1.85rem] [&_svg]:w-[1.85rem]'
)

export const loginLogoTitleClass = 'text-2xl font-extrabold tracking-[-0.02em] text-text'

export const loginLogoSubtitleClass = 'text-[0.85rem] leading-[1.6] text-muted'

export const loginFeaturesClass = 'mb-5 flex list-none flex-col gap-[0.55rem] p-0'

/** Plain rows, no boxes: a few lines of text beside a tinted icon read lighter than three cards. */
export const loginFeatureClass = cx(
  'flex items-center gap-3 px-1 py-1.5',
  'text-[0.84rem] font-semibold leading-[1.45] text-text'
)

export const loginFeatureIconClass = cx(
  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#0f766e]',
  'bg-[rgba(15,118,110,0.1)] [[data-theme=dark]_&]:text-[#5eead4] [[data-theme=dark]_&]:bg-[rgba(94,234,212,0.12)]'
)

export const loginFooterNoteClass = 'mt-4 text-center text-xs leading-[1.55] text-muted'

export const loginTrustBadgeClass = cx(
  'mt-[0.85rem] inline-flex items-center justify-center gap-[0.35rem] rounded-full px-3 py-[0.35rem]',
  'text-[0.7rem] font-semibold text-[#0d5d57] [[data-theme=dark]_&]:text-[#5eead4]',
  'bg-[rgba(15,118,110,0.07)] [[data-theme=dark]_&]:bg-[rgba(94,234,212,0.1)]',
  'border border-[rgba(15,118,110,0.16)] [[data-theme=dark]_&]:border-[rgba(94,234,212,0.2)]'
)

export const googleSignInBtnClass = cx(
  // bg-none drops the primary variant's gradient image, which painted over the surface color.
  '!min-h-touch-min !border-[1.5px] !border-border !bg-surface !bg-none !text-text',
  'hover:enabled:!-translate-y-px hover:enabled:!border-[var(--color-primary-light)] hover:enabled:!bg-bg'
)

export const appLoadingInlineClass = cx(
  'flex items-center justify-center py-16',
  'min-h-[min(14rem,calc(100dvh-11rem))]'
)

export const appLoadingDotsClass = 'flex items-center gap-1.5'

export const appLoadingDotClass =
  'h-2 w-2 rounded-full bg-primary animate-[loadingDotBlink_1.2s_ease-in-out_infinite]'

export const appLoadingDotDelayClasses = [
  '[animation-delay:0s]',
  '[animation-delay:0.2s]',
  '[animation-delay:0.4s]'
] as const
