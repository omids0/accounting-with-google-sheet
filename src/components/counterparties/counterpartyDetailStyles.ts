import { cn } from '../../utils/cn'

export const counterpartyDetailFieldClass =
  'grid gap-1 border-b border-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-border))] py-3 last:border-b-0 last:pb-0 first:pt-0'

export const counterpartyDetailLabelClass =
  'text-[0.74rem] font-bold text-[color-mix(in_srgb,var(--text)_62%,transparent)]'

export const counterpartyDetailValueClass = 'text-[0.88rem] leading-[1.55] text-text'

export const counterpartyDetailListClass = 'grid gap-1.5'

export const counterpartyDetailAccountClass = cn(
  'rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-soft)_40%,var(--color-surface))] px-3 py-2'
)

export const counterpartyDetailAccountBankClass = 'text-[0.82rem] font-semibold text-primary-dark'

export const counterpartyDetailAccountNumberClass =
  'mt-0.5 font-[var(--font-numeric)] text-[0.8rem] text-muted'

export const counterpartyDetailLocationRowClass = 'flex flex-wrap items-center gap-2'

export const counterpartyDetailCoordsClass =
  'inline-flex rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] px-2 py-0.5 font-[var(--font-numeric)] text-[0.78rem] text-primary-dark'
