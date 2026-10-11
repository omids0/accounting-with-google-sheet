import { cn } from '../../utils/cn'

export const onboardingPageClass = cn(
  'mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-bg',
  'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
)

export const onboardingHeaderClass =
  'border-b border-border px-4 py-3 text-center text-[1rem] font-extrabold text-text'

export const onboardingProgressClass = 'flex gap-1.5 px-4 pt-4'

export function onboardingSegmentClass(state: 'done' | 'skipped' | 'current' | 'todo') {
  return cn(
    'h-1.5 flex-1 rounded-full transition-colors duration-[var(--duration-normal)]',
    state === 'done' && 'bg-primary',
    state === 'current' && 'bg-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))]',
    state === 'todo' && 'bg-border',
    state === 'skipped' &&
      '[background:repeating-linear-gradient(45deg,var(--color-border)_0_4px,var(--color-bg)_4px_8px)] border border-border'
  )
}

export const onboardingCountClass = 'pt-1.5 text-center text-[0.75rem] text-muted'

export const onboardingBodyClass =
  'flex flex-1 flex-col gap-4 px-4 py-5 animate-[fadeInUp_0.35s_var(--ease-page)_both]'

export const onboardingTitleClass = 'text-[1.15rem] font-extrabold text-text'

export const onboardingSubtitleClass = 'mt-1 text-[0.85rem] leading-[1.9] text-muted'

export const onboardingListClass =
  'flex flex-col gap-2 rounded-[14px] border border-dashed border-border bg-surface p-3'

export const onboardingListItemClass =
  'flex items-center justify-between gap-2 text-[0.85rem] text-text [&_svg]:text-primary'

export const onboardingSavedNoteClass =
  'flex items-center gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface))] p-3 text-[0.85rem] font-bold text-success'

export const onboardingActionsClass =
  'sticky bottom-0 flex flex-col gap-2 border-t border-border bg-bg px-4 pt-3 pb-4'

export const onboardingLinkButtonClass =
  'mx-auto py-1 text-[0.8rem] text-muted underline underline-offset-4 hover:text-primary'

export const onboardingSummaryClass =
  'flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center'

export const onboardingSummaryIconClass =
  'inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] text-primary [&_svg]:h-8 [&_svg]:w-8'

export const onboardingSummaryRowClass =
  'flex w-full max-w-[280px] justify-between border-b border-dashed border-border py-2 text-[0.85rem] text-muted'

export function onboardingSummaryStatusClass(done: boolean) {
  return done ? 'font-bold text-success' : 'text-muted'
}

export const guideCardClass = cn(
  'flex items-center gap-3 border-[1.5px] border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]',
  'bg-[color-mix(in_srgb,var(--color-accent-soft)_55%,var(--color-surface))]'
)

export const guideCardIconClass =
  'inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-surface text-primary'

export const guideCardTextClass = 'flex min-w-0 flex-1 flex-col gap-0.5'

export const guideCardTitleClass = 'text-[0.9rem] font-extrabold text-text'

export const guideCardHintClass = 'text-[0.78rem] leading-[1.7] text-muted'

export const discoveryCardClass = cn(
  'flex flex-col gap-2 border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]',
  'bg-[color-mix(in_srgb,var(--color-accent-soft)_40%,var(--color-surface))]'
)

export const discoveryHeadClass = 'flex items-center justify-between gap-2'

export const discoveryCountClass =
  'rounded-full border border-border px-2 py-0.5 text-[0.7rem] text-muted'

export const discoveryActionsClass = 'flex flex-wrap items-center gap-2'
