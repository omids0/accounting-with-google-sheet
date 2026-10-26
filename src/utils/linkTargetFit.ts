import { formatMoney } from './formatMoney'
import type { LinkTargetKind } from './linkTargetKinds'
import { roundMoney } from './roundMoney'
import type { LinkTargetChild, LinkTargetItem } from '../services/linkPayment'

export type LinkTargetOption = LinkTargetItem & {
  /** The item cannot take this record (a debt with less left, a check of another amount). */
  disabled: boolean
  /** What the select shows for it, with the amount and why it is disabled. */
  label: string
}

export type LinkTargetChildOption = LinkTargetChild & {
  label: string
  /** Visible under the select when the instalment's amount differs from the record's; '' when it fits. */
  warning: string
}

const sameAmount = (a: number, b: number) => roundMoney(a) === roundMoney(b)

/** True when the item's amount is exactly the record's (the checks listed first). */
export const matchesRecordAmount = (item: LinkTargetItem, recordAmount: number) =>
  recordAmount > 0 && sameAmount(item.remaining, recordAmount)

/** One first-level option for a record of `recordAmount` (0 while the amount is blank). */
export function itemOption(
  kind: LinkTargetKind,
  item: LinkTargetItem,
  recordAmount: number
): LinkTargetOption {
  const money = formatMoney(item.remaining)
  const extra = item.detail ? ` · ${item.detail}` : ''

  if (kind.fit === 'exact') {
    const disabled = recordAmount > 0 && !sameAmount(item.remaining, recordAmount)
    const base = `${item.title} — ${money}${extra}`

    return { ...item, disabled, label: disabled ? `${base} (مبلغ چک با این رکورد فرق دارد)` : base }
  }

  if (kind.fit === 'warn') {
    return { ...item, disabled: false, label: `${item.title}${extra}` }
  }

  const disabled = recordAmount > 0 && item.remaining < recordAmount
  const base = `${item.title} — باقی‌مانده ${money}`

  return { ...item, disabled, label: disabled ? `${base} (کمتر از مبلغ این رکورد)` : base }
}

/** One second-level option (an instalment). A different amount is flagged, never refused. */
export function childOption(child: LinkTargetChild, recordAmount: number): LinkTargetChildOption {
  const differs = recordAmount > 0 && !sameAmount(child.amount, recordAmount)

  return {
    ...child,
    label: `${child.title} — ${formatMoney(child.amount)}`,
    warning: differs
      ? `مبلغ این قسط ${formatMoney(child.amount)} است ولی مبلغ رکورد ${formatMoney(
          recordAmount
        )}؛ باز هم وصل می‌شود و مبلغ قسط عوض نمی‌شود.`
      : ''
  }
}

/** Why the picked option blocks the save ('' when it does not). */
export function pickError(kind: LinkTargetKind, option: LinkTargetOption | undefined): string {
  if (!option?.disabled) return ''

  return kind.fit === 'exact'
    ? `مبلغ ${kind.noun} (${formatMoney(option.remaining)}) با مبلغ رکورد یکی نیست`
    : `مبلغ رکورد نمی‌تواند بیشتر از مانده (${formatMoney(option.remaining)}) باشد`
}
