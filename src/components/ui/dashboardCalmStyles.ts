import { cx } from '../../utils/cn'

/** Dashboard: hero, quick actions, then one soft card per block. */
export const dashboardCalmPageClass = cx('dashboard-page flex flex-col gap-3', '[&_.mb-stack]:mb-0')

export const dashboardPeriodRowClass = 'flex min-h-9 items-center justify-between gap-2'

export const dashboardPeriodChipClass = cx(
  'inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-border bg-surface px-3',
  'text-[0.8rem] font-semibold text-text hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]',
  '[&_.app-icon]:h-3.5 [&_.app-icon]:w-3.5 [&_.app-icon]:text-muted'
)

export const dashboardPeriodTodayClass = 'truncate text-[0.74rem] text-muted'

/** Income / expense / net inside the hero, under the amount (replaces the four stat cards). */
export const dashboardHeroStripClass = cx(
  // Columns drop to a second row when a big amount needs the width; amounts are never ellipsized.
  'relative z-[1] mt-3 grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-1.5'
)

export const dashboardHeroStripItemClass = cx(
  'flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-1.5 py-2 text-[0.7rem] text-white/90',
  'bg-white/[0.13] ring-1 ring-inset ring-white/15'
)

/** Soft light discs behind the hero's content; the card is `isolate`d so they sit under the text. */
export const dashboardHeroGlowClass = {
  top: 'pointer-events-none absolute -top-14 -start-10 -z-10 size-44 rounded-full bg-white/10',
  bottom:
    'pointer-events-none absolute -bottom-20 -end-10 -z-10 size-48 rounded-full bg-white/[0.07]'
}

export const dashboardHeroDotClass = {
  income: 'size-1.5 shrink-0 rounded-full bg-[#86efac]',
  expense: 'size-1.5 shrink-0 rounded-full bg-[#fca5a5]',
  net: 'size-1.5 shrink-0 rounded-full bg-white'
}

export const dashboardHeroStripValueClass =
  'max-w-full text-center font-numeric text-[0.8rem] font-bold tabular-nums text-white [overflow-wrap:anywhere]'

/** Under the strip: «هزینه ماه ۱۲٪ کمتر از شهریور». */
export const dashboardHeroCompareClass =
  'relative z-[1] m-0 mt-2 text-center text-[0.72rem] font-medium text-white/90'

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
 * blocks sit on a surface so the grid reads as cells. On desktop the cells of a row share
 * one height (stretch), so no card ends higher than its neighbour.
 */
export const dashboardGridClass = cx(
  'contents md:grid md:grid-cols-2 md:items-start md:gap-4 xl:grid-cols-12 xl:items-stretch xl:gap-5',
  // A soft card on every screen size: lifted off the page by a shadow, not drawn with hairlines.
  '[&>.calm-block]:rounded-[1.25rem] [&>.calm-block]:border [&>.calm-block]:border-[color-mix(in_srgb,var(--color-border)_70%,transparent)]',
  '[&>.calm-block]:bg-surface [&>.calm-block]:px-3.5 [&>.calm-block]:py-2.5 [&>.calm-block]:shadow-[var(--shadow)]'
)

/** Phones only: four round shortcuts under the hero (desktop has the header buttons). */
export const dashboardQuickActionsClass = 'grid grid-cols-4 gap-2 md:hidden'

export const dashboardQuickActionClass = cx(
  'flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-center',
  'border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-surface text-[0.72rem] font-semibold text-text',
  'shadow-[var(--shadow)] transition-transform duration-[var(--duration-fast)] active:scale-[0.97] motion-reduce:transition-none'
)

export const dashboardQuickActionIconClass = {
  income: 'bg-[var(--color-success-bg)] text-success',
  expense: 'bg-[var(--color-danger-bg)] text-danger',
  neutral: 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary-dark'
}

export const dashboardQuickActionIconWrapClass =
  'inline-flex size-9 items-center justify-center rounded-full'

export const dashboardCellClass = {
  /** Stretched to the row height with its content centred. */
  hero: 'xl:col-span-4 xl:flex xl:flex-col xl:justify-center',
  upcoming: 'xl:col-span-4',
  analysis: 'xl:col-span-4',
  /** Moves after «تحلیل» on desktop (order 1 vs. the default 0). */
  recent: 'xl:order-1 xl:col-span-8',
  /** «فعالیت اخیر» (shared spreadsheets) right under «تراکنش‌های اخیر». */
  activity: 'xl:order-1 xl:col-span-8',
  balance: 'xl:order-1 xl:col-span-4'
}
