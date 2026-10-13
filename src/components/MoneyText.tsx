import MaskedAmount from './MaskedAmount'
import type { CurrencyUnit } from '../types'
import type { AmountMaskSize } from '../utils/amountMask'
import { formatCompactNumber, formatMoney, formatSignedMoney } from '../utils/formatMoney'

/**
 * An amount as plain text inside a row, card or chart label (where a full
 * `MoneyDisplay` block would not fit), masked in hidden-amounts mode.
 *
 * - `signed`: `−۴٬۵۰۰ تومان`; `'plus'` also prefixes positives with `+`
 * - `compact`: `۳٫۵ م`, no unit (chart labels)
 */
export default function MoneyText({
  amount,
  currency,
  signed = false,
  compact = false,
  size,
  revealable,
  className
}: {
  amount: number
  currency?: CurrencyUnit
  signed?: boolean | 'plus'
  compact?: boolean
  size?: AmountMaskSize
  revealable?: boolean
  /** Applied to the mask only; the visible text inherits its parent's style. */
  className?: string
}) {
  const text = compact
    ? formatCompactNumber(amount)
    : signed
    ? formatSignedMoney(amount, { showPlus: signed === 'plus', currency })
    : formatMoney(amount, currency)

  return (
    <MaskedAmount
      size={size ?? (compact ? 'compact' : 'text')}
      revealable={revealable}
      className={className}
    >
      {text}
    </MaskedAmount>
  )
}
