import { cx } from '../../utils/cn'

export const syncDetailsListClass = 'm-0 mt-3 flex list-none flex-col gap-2 p-0'

export const syncDetailsItemClass = cx(
  'rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-bg px-3 py-2.5'
)

export const syncDetailsItemHeaderClass = 'flex flex-wrap items-center justify-between gap-2'

export const syncDetailsFailedTagClass =
  'rounded-full border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-2 py-[0.05rem] text-[0.7rem] font-bold text-danger'

export const syncDetailsFieldsClass = 'm-0 mt-1 text-[0.8rem] leading-[1.6] text-text'

export const syncDetailsCauseClass = 'm-0 mt-1 text-[0.78rem] leading-[1.6] text-muted'

export const syncDetailsActionsClass = 'mt-2 flex flex-wrap gap-2'
