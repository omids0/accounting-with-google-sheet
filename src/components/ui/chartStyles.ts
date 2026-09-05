import { cardClassName } from './Card'
import { cn } from '../../utils/cn'

export const dashboardPageClass =
  'flex flex-col gap-[var(--space-stack)] [&>.card]:mb-0 [&>.dashboard-flow-section]:mb-0 [&>.chart-card]:mb-0'

export const dashboardHeroCardClass = cn(
  cardClassName(),
  'relative mb-[var(--space-stack)] overflow-hidden border-none text-center text-white shadow-[0_8px_28px_rgba(15,118,110,0.3)]',
  '[background:linear-gradient(135deg,#0f766e_0%,#14b8a6_50%,#2dd4bf_100%)] [background-size:200%_200%] animate-[headerGlow_6s_ease_infinite]'
)

export const dashboardHeroCardAnimatedClass =
  'after:pointer-events-none after:absolute after:inset-[-40%_-20%] after:animate-[heroShimmer_5s_ease-in-out_infinite] after:content-[""] after:[background:radial-gradient(circle,rgba(255,255,255,0.18),transparent_60%)]'

export const dashboardHeroHeaderClass =
  'relative mb-1 flex min-h-6 items-center justify-center [&_.dashboard-hero-label]:mb-0 [&_.card-action-btn]:absolute [&_.card-action-btn]:top-1/2 [&_.card-action-btn]:-translate-y-1/2 [&_.card-action-btn]:border [&_.card-action-btn]:border-white/20 [&_.card-action-btn]:bg-white/15 [&_.card-action-btn]:text-white/90 [&_.card-action-btn]:end-0 hover:[&_.card-action-btn]:bg-white/25 hover:[&_.card-action-btn]:text-white'

export const dashboardHeroLabelClass = 'mb-1 text-[0.8rem] font-medium opacity-90'

export const dashboardHeroHintClass = 'm-0 text-[0.72rem] opacity-85'

export const dashboardFlowSectionClass = 'mb-[var(--space-stack)]'

export const dashboardFlowSectionAnimatedClass = cn(
  '[&>.stat-grid_.stat-card]:animate-[statCardIn_0.5s_var(--ease-page)_both] [&>.stat-card-wide]:animate-[statCardIn_0.5s_var(--ease-page)_both]',
  '[&>.stat-grid_.stat-card:nth-child(1)]:[animation-delay:0.05s] [&>.stat-grid_.stat-card:nth-child(2)]:[animation-delay:0.12s]',
  '[&>.stat-card-wide:nth-of-type(2)]:[animation-delay:0.18s] [&>.stat-card-wide:nth-of-type(3)]:[animation-delay:0.24s]'
)

export const dashboardAssetsCardClass = 'mb-4'

export const dashboardLiabilitiesCardClass =
  '[&_.asset-value]:text-[#b91c1c] [&_.asset-row-total_.asset-value]:text-[#991b1b]'

export const assetBreakdownClass = 'flex flex-col gap-2'

export const assetRowClass =
  'flex items-center justify-between border-b border-dashed border-border py-[0.35rem] text-[0.85rem] last:border-b-0'

export const assetRowTotalClass = 'mt-1 border-t-2 border-b-0 border-border pt-2 font-bold'

export const assetLabelClass = 'text-muted'

export const assetLabelLinkClass =
  'cursor-pointer border-none bg-transparent p-0 text-right font-[inherit] text-muted hover:text-text active:opacity-75'

export const assetValueClass = 'font-bold tracking-[0.01em] text-primary-dark'

export const statGridClass = 'mb-0 grid grid-cols-3 gap-[0.4rem]'

export const statGrid2Class = 'grid-cols-2'

export const dashboardStatGridClass = cn(
  statGridClass,
  'grid-cols-2 [&_.stat-card]:flex [&_.stat-card]:min-h-[4.25rem] [&_.stat-card]:flex-col [&_.stat-card]:justify-center [&_.stat-card]:gap-1 [&_.stat-card]:px-[0.4rem] [&_.stat-card]:py-[0.6rem] [&_.stat-label]:mb-0 [&_.stat-label]:text-[0.72rem] [&_.stat-card__value-row]:items-stretch [&_.sparkline]:self-center'
)

export function statCardClass({
  variant,
  wide,
  lift,
  animated = true,
  className
}: {
  variant?: 'income' | 'expense' | 'balance' | 'flow' | 'default'
  wide?: boolean
  lift?: boolean
  animated?: boolean
  className?: string
}) {
  return cn(
    wide ? cardClassName() : '',
    'rounded-[var(--radius)] border border-border text-center transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow)]',
    !wide && 'px-2 py-3',
    wide && 'mt-2 flex w-full items-center justify-between px-4 py-[0.9rem] text-right',
    animated && 'animate-[statCardIn_0.5s_var(--ease-page)_both]',
    variant === 'income' &&
      'border-[var(--color-success-border)] bg-[var(--color-success-bg)] [&_.stat-value]:text-success',
    variant === 'expense' &&
      'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] [&_.stat-value]:text-danger',
    variant === 'balance' && 'bg-bg [&_.stat-value]:text-primary-dark',
    variant === 'flow' && 'border-border bg-bg [&_.stat-value]:text-primary-dark',
    lift &&
      'transition-[transform,box-shadow] duration-[var(--duration-normal)] hover:-translate-y-[3px]',
    className
  )
}

export function statFlowModifierClass(direction?: 'positive' | 'negative' | 'neutral') {
  if (direction === 'positive') return '[&_.stat-value]:text-success'
  if (direction === 'negative') return '[&_.stat-value]:text-danger'
  return ''
}

export const statLabelClass =
  'mb-1 block text-[0.7rem] text-muted [.stat-card-wide_&]:mb-0 [.stat-card-wide_&]:text-[0.78rem]'

export const statValueClass = 'block text-[0.85rem] font-extrabold tracking-[-0.02em] tabular-nums'

export const statCardValueRowClass = 'flex w-full flex-col items-center gap-[0.35rem]'

export const statCardValueRowWideClass =
  'flex-row items-center justify-end gap-3 flex-1 [.stat-card-wide_&]:flex-row [.stat-card-wide_&]:items-center [.stat-card-wide_&]:justify-end [.stat-card-wide_&]:gap-3 [.stat-card-wide_&]:flex-1 [.stat-card.receivable-total-card_&]:justify-center [.stat-card.dang-total-footer_&]:justify-center'

export const statLiabilityClass =
  'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] [&_.stat-value]:text-[var(--color-warning)]'

export const sparklineClass = 'w-full max-w-[5.5rem] shrink-0 opacity-85'

export const sparklineWideClass = 'max-w-[4.5rem]'

export const chartCardClass = cn(
  cardClassName(),
  'relative isolate overflow-visible pb-[0.35rem] [background:linear-gradient(160deg,var(--color-surface)_0%,color-mix(in_srgb,var(--color-accent-soft)_55%,var(--color-surface))_100%)]',
  'before:pointer-events-none before:absolute before:inset-0 before:content-[""] before:[background:radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent_55%)]',
  '[&.chart-card--animated]:animate-[chartCardIn_0.55s_var(--ease-page)_both]'
)

export const chartTitleClass =
  'mb-[0.45rem] text-[0.82rem] font-semibold text-primary-dark [.card-header-row_&]:mb-0'

export const chartBarWrapClass = cn(
  'relative z-[1] m-0 w-full',
  '[&_.recharts-cartesian-axis-tick-value]:font-[family-name:var(--font-numeric)] [&_.recharts-cartesian-axis-tick-value]:[font-feature-settings:"tnum"_1]',
  '[&_.recharts-bar-rectangle]:transition-[filter] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  '[&_.recharts-active-bar_.recharts-bar-rectangle]:brightness-[1.08] [&_.recharts-active-bar_.recharts-bar-rectangle]:saturate-[1.1]',
  '[&_.recharts-legend-item-text]:font-semibold [&_.recharts-legend-item-text]:text-muted!'
)

export const chartMonthlyWrapClass = 'min-h-0'

export const chartMonthlyLegendClass =
  'mt-[0.45rem] flex justify-center gap-[0.85rem] text-[0.78rem] font-semibold text-muted'

export const chartMonthlyLegendItemClass = 'inline-flex items-center gap-[0.35rem]'

export const chartMonthlyLegendDotClass = 'h-2 w-2 shrink-0 rounded-full'

export const chartMonthlyLegendDotIncomeClass = 'bg-[var(--color-income)]'

export const chartMonthlyLegendDotExpenseClass = 'bg-[var(--color-expense)]'

export const chartTooltipClass = cn(
  'min-w-[9.5rem] animate-[chartTooltipIn_0.18s_var(--ease-out)] rounded-xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] p-[0.65rem_0.75rem] shadow-[0_12px_28px_rgba(15,23,42,0.14),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl',
  '[background:color-mix(in_srgb,var(--color-surface)_92%,transparent)]'
)

export const chartTooltipLabelClass =
  'mb-[0.45rem] border-b border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] pb-[0.35rem] text-[0.78rem] font-bold text-primary-dark'

export const chartTooltipRowsClass = 'flex flex-col gap-[0.35rem]'

export const chartTooltipRowClass =
  'grid grid-cols-[auto_1fr_auto] items-center gap-[0.45rem] text-[0.76rem]'

export function chartTooltipDotClass(tone: 'income' | 'expense' | 'neutral') {
  return cn(
    'h-[0.55rem] w-[0.55rem] shrink-0 rounded-full',
    tone === 'income' &&
      'bg-[var(--color-income)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-income)_22%,transparent)]',
    tone === 'expense' &&
      'bg-[var(--color-expense)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-expense)_22%,transparent)]',
    tone === 'neutral' &&
      'bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]'
  )
}

export const chartTooltipNameClass = 'font-semibold text-muted'

export const chartTooltipValueClass =
  'font-extrabold tabular-nums text-text [font-feature-settings:"tnum"_1]'

export const categoryDonutLayoutClass =
  'grid grid-cols-[minmax(0,1fr)] gap-2 min-[520px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] min-[520px]:items-center'

export const categoryDonutChartWrapClass = 'relative z-[1] min-h-[168px]'

export const categoryDonutCenterClass =
  'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[0.15rem] text-center'

export const categoryDonutCenterLabelClass = 'text-[0.68rem] font-semibold text-muted'

export const categoryDonutCenterValueClass =
  'text-[0.78rem] font-extrabold tabular-nums text-primary-dark [font-feature-settings:"tnum"_1]'

export const categoryDonutLegendClass = 'm-0 flex list-none flex-col gap-[0.3rem] p-0'

export const categoryDonutLegendItemClass =
  'grid grid-cols-[auto_1fr_auto_auto] items-center gap-[0.35rem] rounded-sm px-[0.35rem] py-1 text-[0.72rem] transition-[background] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_70%,transparent)]'

export const categoryDonutLegendDotClass = 'h-[0.55rem] w-[0.55rem] shrink-0 rounded-full'

export const categoryDonutLegendNameClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-text'

export const categoryDonutLegendPctClass =
  'text-[0.68rem] font-bold tabular-nums text-muted [font-feature-settings:"tnum"_1]'

export const categoryDonutLegendValueClass =
  'font-extrabold tabular-nums text-primary-dark [font-feature-settings:"tnum"_1]'

export const categoryDonutSliceClass = 'transition-opacity duration-[var(--duration-fast)]'

export const netAvailableSettingsPageClass = 'flex flex-col gap-3 [&>.card]:mb-0'

export const netAvailablePreviewCardClass = 'mb-0'

export const netAvailableSectionHintClass = 'mb-3 text-[0.78rem] text-muted'

export const dashboardOpeningCardClass = cn(
  'mb-[var(--space-stack)] border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-accent-soft)_80%,var(--color-surface))_0%,var(--color-surface)_100%)] p-0',
  '[&_.installment-header:hover]:bg-[color-mix(in_srgb,var(--color-accent-soft)_65%,transparent)]',
  '[&_.installment-payments]:[background:linear-gradient(180deg,color-mix(in_srgb,var(--color-accent-soft)_55%,transparent)_0%,transparent_100%)]'
)

export const dashboardOpeningBodyClass = 'pt-[0.55rem]'

export const dashboardOpeningHintClass =
  'mb-3 rounded-sm border border-dashed border-[var(--form-input-border)] bg-[var(--form-input-bg)] px-[0.65rem] py-[0.55rem] text-[0.78rem] leading-[1.55] text-muted'

export const dashboardOpeningFormClass = 'flex items-end gap-[0.55rem]'

export const dashboardOpeningInputWrapClass = 'min-w-0 flex-1'

export const walletOpeningMoreBtnClass = 'mt-3 w-full'

export const appIconClass = 'block shrink-0 [shape-rendering:geometricPrecision]'

export const appIconBgClass = 'fill-current opacity-[0.14]'

export const appIconAccentClass = 'fill-current opacity-[0.28]'

export const headerIconAppIconClass = '[&_.app-icon]:drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]'

export const bottomNavDashboardIconClass = '[&_.app-icon]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]'

export const fabAppIconClass = '[&_.app-icon]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]'

export const reportTableRowInteractiveClass =
  'transition-[background,transform] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_50%,transparent)] hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:hover:translate-x-0'
