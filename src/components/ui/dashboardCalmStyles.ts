import { cx } from '../../utils/cn'

/** Round 5 dashboard: hero plus flat blocks, a little more air between them than between rows. */
export const dashboardCalmPageClass = cx('dashboard-page flex flex-col gap-4', '[&_.mb-stack]:mb-0')

export const dashboardPeriodRowClass = 'flex min-h-9 items-center justify-between gap-2'

export const dashboardPeriodChipClass = cx(
  'inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-border bg-surface px-3',
  'text-[0.8rem] font-semibold text-text hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]',
  '[&_.app-icon]:h-3.5 [&_.app-icon]:w-3.5 [&_.app-icon]:text-muted'
)

export const dashboardPeriodTodayClass = 'truncate text-[0.74rem] text-muted'

/** Income / expense / net inside the hero, under the amount (replaces the four stat cards). */
export const dashboardHeroStripClass = cx(
  'relative z-[1] mt-3 grid grid-cols-3 gap-1 border-t border-dashed border-white/30 pt-2.5'
)

export const dashboardHeroStripItemClass =
  'flex min-w-0 flex-col items-center gap-0.5 text-[0.7rem] text-white/90'

export const dashboardHeroStripValueClass =
  'max-w-full truncate font-numeric text-[0.8rem] font-bold tabular-nums text-white'

/** «می‌دانستی؟» as one line: title, «برو ببین» and a close button. */
export const discoveryRowClass = cx(
  'flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-3 py-1.5',
  '[&_.app-icon]:shrink-0 [&_.app-icon]:text-primary-dark'
)

export const discoveryRowTextClass = 'min-w-0 flex-1 truncate text-[0.78rem] text-text'

export const discoveryRowCloseClass = cx(
  'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted',
  'hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] hover:text-text'
)

/**
 * The five blocks. Phones: part of the page column (`contents`). Tablets: two
 * columns in DOM order. Desktop: 12 columns — hero, «پیش رو», «تحلیل» (c4 each),
 * then «تراکنش‌های اخیر» (c8) and «دارایی و بدهی» (c4). From tablet up the flat
 * blocks sit on a surface so the grid reads as cells.
 */
export const dashboardGridClass = cx(
  'contents md:grid md:grid-cols-2 md:items-start md:gap-4 xl:grid-cols-12 xl:gap-5',
  '[&>.calm-block]:md:rounded-[var(--radius)] [&>.calm-block]:md:border [&>.calm-block]:md:border-border',
  '[&>.calm-block]:md:bg-surface [&>.calm-block]:md:px-3.5 [&>.calm-block]:md:py-2.5'
)

export const dashboardCellClass = {
  hero: 'xl:col-span-4',
  upcoming: 'xl:col-span-4',
  analysis: 'xl:col-span-4',
  /** Moves after «تحلیل» on desktop (order 1 vs. the default 0). */
  recent: 'xl:order-1 xl:col-span-8',
  balance: 'xl:order-1 xl:col-span-4'
}
