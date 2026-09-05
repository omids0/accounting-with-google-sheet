import { cn } from '../../utils/cn'
import type { MoneyDisplaySize, MoneyDisplayTone } from '../MoneyDisplay'

export const emptyTextClass = 'py-4 text-center text-[0.85rem] text-muted'

export const emptyStateClass = 'px-[0.65rem] py-5 text-center text-muted'

export const emptyStateIconClass = cn(
  'mb-4 inline-flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[18px] text-primary',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface)),color-mix(in_srgb,var(--color-accent-soft)_85%,var(--color-surface)))]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_24px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
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
    'inline-flex items-center gap-[0.3rem] rounded-[20px] px-[0.6rem] py-1 text-xs font-medium',
    connected
      ? 'bg-[var(--color-success-bg)] text-success'
      : 'bg-[var(--color-danger-bg)] text-danger'
  )
}

const moneyDisplayBaseClass = 'tabular-nums [font-feature-settings:"tnum"_1]'

const moneyDisplayValueClass = cn(moneyDisplayBaseClass, 'font-[family-name:var(--font-numeric)]')

const moneyDisplayUnitClass = 'font-[family-name:var(--font-text)] font-semibold'

const sizeClass: Record<MoneyDisplaySize, string> = {
  hero: cn(
    'mb-[0.35rem] flex flex-col items-center gap-[0.2rem] text-inherit',
    '[&>span:nth-child(2)]:text-[clamp(1.35rem,6vw,1.85rem)] [&>span:nth-child(2)]:font-extrabold [&>span:nth-child(2)]:leading-[1.05] [&>span:nth-child(2)]:tracking-[0.02em]',
    '[&>span:last-child]:text-[0.74rem] [&>span:last-child]:font-semibold [&>span:last-child]:opacity-90'
  ),
  stat: cn(
    'flex max-w-full min-w-0 flex-col items-center gap-[0.12rem]',
    '[&>span:nth-child(2)]:max-w-full [&>span:nth-child(2)]:text-[clamp(0.88rem,3.2vw,1.05rem)] [&>span:nth-child(2)]:font-extrabold [&>span:nth-child(2)]:leading-[1.15] [&>span:nth-child(2)]:tracking-[0.015em]',
    '[&>span:last-child]:text-[0.62rem] [&>span:last-child]:font-semibold [&>span:last-child]:leading-none [&>span:last-child]:opacity-75'
  ),
  'stat-wide': cn(
    'inline-flex flex-shrink-0 items-baseline gap-1 whitespace-nowrap',
    '[&>span:nth-child(2)]:text-[clamp(0.92rem,3.2vw,1.08rem)] [&>span:nth-child(2)]:font-extrabold [&>span:nth-child(2)]:tracking-[0.015em]',
    '[&>span:last-child]:text-[0.66rem] [&>span:last-child]:font-semibold [&>span:last-child]:opacity-75'
  ),
  record: cn(
    'inline-flex flex-shrink-0 items-baseline gap-[0.2rem] whitespace-nowrap leading-[1.2]',
    '[&>span:first-child]:text-[0.72rem] [&>span:first-child]:font-semibold [&>span:first-child]:opacity-85',
    '[&>span:nth-child(2)]:text-[0.86rem] [&>span:nth-child(2)]:font-bold [&>span:nth-child(2)]:tracking-[0.01em]',
    '[&>span:last-child]:text-[0.64rem] [&>span:last-child]:font-semibold [&>span:last-child]:opacity-75'
  )
}

const toneClass: Record<MoneyDisplayTone, string> = {
  default: '',
  hero: '',
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
  return cn(moneyDisplayBaseClass, sizeClass[size], toneClass[tone], className)
}

export const moneyDisplaySignClass = moneyDisplayValueClass

export const moneyDisplayValueClassName = moneyDisplayValueClass

export const moneyDisplayUnitClassName = moneyDisplayUnitClass

export const recordItemClass =
  'flex items-center justify-between gap-3 border-b border-border py-[0.85rem] last:border-b-0'

export const recordItemMainClass = 'min-w-0 flex-1'

export const recordItemActionsClass = 'm-0 self-center'

export const treasuryTxItemClass = 'relative'

export const treasuryTxEditClass = 'absolute left-1 top-1 [&_.card-action-buttons]:m-0'

export const pageSearchClearClass = cn(
  'absolute start-[0.45rem] top-1/2 flex h-[1.35rem] w-[1.35rem] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none leading-none',
  'bg-[rgba(15,118,110,0.1)] text-muted transition-[background,color] duration-[var(--duration-fast)]',
  'hover:bg-[rgba(15,118,110,0.18)] hover:text-text',
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]'
)

export const pageSearchInputClass =
  '[&::-webkit-search-cancel-button]:hidden focus-visible:border-primary focus-visible:bg-surface focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] focus-visible:outline-none'

export const appToasterClass = 'z-[10000]'
