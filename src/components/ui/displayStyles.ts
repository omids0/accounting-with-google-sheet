import { cn } from '../../utils/cn'
import type { MoneyDisplaySize, MoneyDisplayTone } from '../MoneyDisplay'

export const emptyTextClass = 'py-4 text-center text-[0.85rem] text-muted'

export const emptyStateClass =
  'px-[0.65rem] py-6 text-center text-muted animate-[fadeInUp_0.45s_var(--ease-page)_both]'

export const emptyStateIconClass = cn(
  'mb-4 inline-flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-[20px] text-primary',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_90%,var(--color-surface)))]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_28px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]',
  'ring-1 ring-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
  '[&_svg]:h-8 [&_svg]:w-8'
)

export const spinnerClass = cn(
  'inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-[spin_0.6s_linear_infinite]'
)

export const spinnerLgClass = cn(
  'h-8 w-8 rounded-full border-[3px] border-[rgba(15,118,110,0.15)] border-t-primary animate-[spin_0.6s_linear_infinite]'
)

export function statusBadgeClass(connected?: boolean) {
  return cn(
    'inline-flex items-center gap-[0.3rem] rounded-[20px] px-[0.6rem] py-1 text-[0.75rem] font-medium',
    connected
      ? 'bg-[var(--color-success-bg)] text-success'
      : 'bg-[var(--color-danger-bg)] text-danger'
  )
}

const moneyDisplayRootBaseClass = 'money-display tabular-nums [font-feature-settings:"tnum"_1]'

const moneyDisplaySizeClass: Record<MoneyDisplaySize, string> = {
  hero: cn(
    'mb-[0.35rem] flex flex-col items-center gap-[0.2rem] text-inherit',
    '[&_.money-display__value]:text-[clamp(1.35rem,6vw,1.85rem)] [&_.money-display__value]:font-extrabold [&_.money-display__value]:leading-[1.05] [&_.money-display__value]:tracking-[0.02em]',
    '[&_.money-display__unit]:text-[0.74rem] [&_.money-display__unit]:font-semibold [&_.money-display__unit]:opacity-90'
  ),
  stat: cn(
    'flex max-w-full min-w-0 flex-col items-center gap-[0.12rem]',
    '[&_.money-display__value]:max-w-full [&_.money-display__value]:text-[clamp(0.88rem,3.2vw,1.05rem)] [&_.money-display__value]:font-extrabold [&_.money-display__value]:leading-[1.15] [&_.money-display__value]:tracking-[0.015em]',
    '[&_.money-display__unit]:text-[0.62rem] [&_.money-display__unit]:font-semibold [&_.money-display__unit]:leading-none [&_.money-display__unit]:opacity-75'
  ),
  'stat-wide': cn(
    'inline-flex flex-shrink-0 items-baseline gap-1 whitespace-nowrap',
    '[&_.money-display__value]:text-[clamp(0.92rem,3.2vw,1.08rem)] [&_.money-display__value]:font-extrabold [&_.money-display__value]:tracking-[0.015em]',
    '[&_.money-display__unit]:text-[0.66rem] [&_.money-display__unit]:font-semibold [&_.money-display__unit]:opacity-75'
  ),
  record: cn(
    'inline-flex flex-shrink-0 items-baseline gap-[0.12rem] whitespace-nowrap leading-[1.2]',
    '[&_.money-display__sign]:text-[0.68rem] [&_.money-display__sign]:font-semibold [&_.money-display__sign]:opacity-85',
    '[&_.money-display__value]:text-[0.76rem] [&_.money-display__value]:font-semibold [&_.money-display__value]:tracking-[0.01em]',
    '[&_.money-display__unit]:text-[0.52rem] [&_.money-display__unit]:font-normal [&_.money-display__unit]:opacity-65'
  )
}

const moneyDisplayToneClass: Record<MoneyDisplayTone, string> = {
  default: '',
  hero: 'text-inherit',
  income: 'text-success',
  expense: 'text-danger',
  positive: 'text-success',
  negative: 'text-danger',
  primary: 'text-[var(--color-primary-dark)]'
}

export function moneyDisplayClass({
  size = 'stat',
  tone = 'default',
  className
}: {
  size?: MoneyDisplaySize
  tone?: MoneyDisplayTone
  className?: string
}) {
  return cn(
    moneyDisplayRootBaseClass,
    `money-display--${size}`,
    `money-display--${tone}`,
    moneyDisplaySizeClass[size],
    moneyDisplayToneClass[tone],
    className
  )
}

export const moneyDisplaySignClass = cn('money-display__sign font-numeric')

export const moneyDisplayValueClassName = cn(
  'money-display__value stat-value font-numeric tabular-nums tracking-[-0.02em]'
)

export const moneyDisplayUnitClassName = cn('money-display__unit font-sans')

export const recordItemClass =
  'flex items-center justify-between gap-3 border-b border-border py-[0.85rem] last:border-b-0'

export const recordItemMainClass = 'min-w-0 flex-1'

export const recordItemActionsClass = 'm-0 self-center'

export const treasuryTxItemClass = 'relative'

export const treasuryTxEditClass = 'absolute left-1 top-1 [&_.card-action-buttons]:m-0'

export const pageSearchClearClass = cn(
  'absolute start-[0.35rem] top-1/2 flex h-touch-min w-touch-min -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none leading-none',
  'bg-[rgba(15,118,110,0.1)] text-muted transition-[background,color] duration-[var(--duration-fast)]',
  'hover:bg-[rgba(15,118,110,0.18)] hover:text-text',
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]'
)

export const pageSearchInputClass =
  '[&::-webkit-search-cancel-button]:hidden focus-visible:border-primary focus-visible:bg-surface focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] focus-visible:outline-none'

export const appToasterClass = 'z-[10000]'

export const dashboardHeroMoneyDisplayClass = 'relative z-[1]'
