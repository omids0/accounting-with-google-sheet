import { cardClassName } from './Card'
import { cn } from '../../utils/cn'

export const appLockCardClass = cardClassName(
  'overflow-hidden border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] p-0 shadow-[var(--shadow),0_10px_30px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]'
)

export const appLockHeroClass = cn(
  'relative overflow-hidden px-card pb-[0.85rem] pt-card',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))_0%,color-mix(in_srgb,var(--color-accent-soft)_55%,var(--color-surface))_100%)]',
  'before:pointer-events-none before:absolute before:-top-8 before:end-[-1.5rem] before:h-24 before:w-24 before:rounded-full before:bg-[color-mix(in_srgb,var(--color-primary-light)_18%,transparent)] before:blur-2xl before:content-[""]',
  'after:pointer-events-none after:absolute after:-bottom-6 after:start-[-1rem] after:h-20 after:w-20 after:rounded-full after:bg-[color-mix(in_srgb,var(--color-accent-mid)_35%,transparent)] after:blur-2xl after:content-[""]'
)

export const appLockHeroContentClass = 'relative z-[1] flex items-start gap-3'

export const appLockHeroIconClass = cn(
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-primary',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_16%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_90%,var(--color-surface)))]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_20px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
  '[&_svg]:h-[1.45rem] [&_svg]:w-[1.45rem]'
)

export const appLockHeroTitleClass =
  'm-0 text-[1.02rem] font-extrabold tracking-[-0.02em] text-[var(--color-primary-dark)]'

export const appLockHeroSubtitleClass = 'mt-1 text-[0.78rem] leading-[1.55] text-muted'

export const appLockBodyClass = 'flex flex-col gap-3 px-card pb-card pt-[0.15rem]'

export const appLockStatusStripClass = 'flex flex-wrap gap-2'

export function appLockStatusPillClass(active?: boolean) {
  return cn(
    'inline-flex items-center gap-[0.35rem] rounded-full border px-[0.65rem] py-[0.3rem] text-[0.74rem] font-semibold',
    active
      ? 'border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[var(--color-success-bg)] text-success'
      : 'border-border bg-bg text-muted'
  )
}

export const appLockSectionClass =
  'rounded-[calc(var(--radius-sm)+2px)] border border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_72%,var(--color-surface))] p-[0.7rem]'

export const appLockSectionTitleClass =
  'mb-[0.55rem] text-[0.76rem] font-bold tracking-[0.01em] text-[var(--color-primary-dark)]'

export const appLockIntroClass = 'text-[0.78rem] leading-[1.55] text-muted'

export const appLockFootnoteClass =
  'rounded-sm border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-bg px-[0.65rem] py-[0.55rem] text-[0.72rem] leading-[1.5] text-muted'

export const appLockPolicyClass = 'flex flex-col gap-2.5'

export const appLockPolicyListClass = 'flex flex-col gap-[0.45rem]'

export function appLockPolicyOptionClass(selected?: boolean) {
  return cn(
    'flex w-full cursor-pointer flex-col items-stretch gap-[0.28rem] rounded-[calc(var(--radius-sm)+1px)] border bg-surface p-[0.55rem] text-start text-text',
    'transition-[border-color,background-color,box-shadow,transform] duration-[var(--duration-fast)]',
    'hover:border-[var(--form-input-border-hover)] hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]',
    selected
      ? 'border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))] shadow-[0_4px_14px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
      : 'border-[color-mix(in_srgb,var(--color-border)_90%,transparent)]'
  )
}

export const appLockPolicyOptionMainClass = 'flex items-center gap-[0.55rem]'

export function appLockPolicyOptionIconClass(selected?: boolean) {
  return cn(
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-primary',
    selected
      ? 'bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))]'
      : 'bg-[color-mix(in_srgb,var(--color-accent-soft)_80%,var(--color-surface))]'
  )
}

export function appLockPolicyOptionRadioClass(selected?: boolean) {
  return cn(
    'ms-auto inline-flex h-[1rem] w-[1rem] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-white',
    selected && 'border-primary bg-primary'
  )
}

export const appLockPolicyOptionLabelClass = 'text-[0.84rem] font-semibold leading-[1.35]'

export const appLockPolicyOptionDescriptionClass =
  'ps-[2.45rem] text-[0.73rem] leading-[1.45] text-muted'

export const appLockPolicyIdleClass = 'pt-[0.1rem]'

export const appLockActionsClass = 'flex flex-wrap gap-2'

export const appLockPrimaryActionClass = 'w-full'

export const appLockFormClass =
  'flex flex-col gap-2.5 rounded-[calc(var(--radius-sm)+2px)] border border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-bg p-[0.7rem]'

export const appLockPinInputClass = 'text-left tabular-nums tracking-[0.2em]'

export const appLockFormActionsClass = 'flex flex-wrap gap-2'

export const appLockCheckboxClass =
  'flex cursor-pointer items-start gap-2 rounded-sm border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-surface px-[0.6rem] py-[0.5rem] text-[0.8rem] leading-[1.45] text-muted [&_input]:mt-[0.12rem]'
