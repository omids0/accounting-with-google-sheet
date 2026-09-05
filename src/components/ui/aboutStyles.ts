import { cn } from '../../utils/cn'

export const aboutPageClass = 'flex flex-col gap-2 pb-4'

export const aboutHeroClass = 'px-4 py-5 text-center'

export const aboutHeroIconClass = cn(
  'mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-primary',
  '[background:var(--color-primary-soft,rgba(15,118,110,0.12))]'
)

export const aboutHeroTitleClass = 'm-0 mb-2 text-xl font-bold'

export const aboutHeroTaglineClass = 'm-0 mb-2 text-sm leading-[1.7] text-muted'

export const aboutHeroVersionClass = 'm-0 text-xs text-muted'

export const aboutIntroClass = 'm-0 px-1 pb-1 text-[0.8125rem] leading-[1.7] text-muted'

export function aboutSectionClass(expanded?: boolean) {
  return cn('overflow-hidden p-0', expanded && 'about-section--expanded')
}

export const aboutSectionTriggerClass = cn(
  'flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 py-[0.875rem] text-start text-inherit',
  'hover:[background:var(--color-surface-elevated,rgba(0,0,0,0.03))]'
)

export const aboutSectionIconClass = cn(
  'inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.625rem] text-primary',
  '[background:var(--color-surface-elevated,rgba(0,0,0,0.04))]'
)

export const aboutSectionTextClass = 'flex min-w-0 flex-1 flex-col gap-[0.15rem]'

export const aboutSectionTitleClass = 'text-[0.9375rem] font-bold leading-[1.4]'

export const aboutSectionSummaryClass = 'text-xs leading-[1.5] text-muted'

export function aboutSectionChevronClass(expanded?: boolean) {
  return cn(
    'inline-flex flex-shrink-0 text-muted transition-transform duration-[var(--duration-slow,0.25s)] ease-[var(--ease-out,ease)]',
    expanded && 'rotate-180'
  )
}

export const aboutFeatureListClass = 'm-0 flex list-none flex-col gap-1 px-4 pb-3'

export const aboutFeatureItemClass = 'border-t border-[var(--color-border,rgba(0,0,0,0.08))]'

export function aboutFeatureTriggerClass(expanded?: boolean) {
  return cn(
    'flex w-full cursor-pointer items-center justify-between gap-2 border-none bg-transparent py-2.5 text-start text-inherit',
    'hover:text-primary',
    expanded && 'about-feature-trigger--expanded'
  )
}

export const aboutFeatureTitleClass = 'text-[0.8125rem] font-semibold leading-[1.4]'

export function aboutFeatureChevronClass(expanded?: boolean) {
  return cn(
    'inline-flex flex-shrink-0 text-muted transition-transform duration-[var(--duration-slow,0.25s)] ease-[var(--ease-out,ease)]',
    expanded && 'rotate-180'
  )
}

export const aboutFeatureDescriptionClass = 'm-0 pb-2.5 text-[0.8125rem] leading-[1.7] text-muted'

export const aboutFooterClass = 'p-4 text-[0.8125rem] leading-[1.7] text-muted [&_p]:m-0'
