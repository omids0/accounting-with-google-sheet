import { useEffect, useId, useState } from 'react'

import {
  largeQuantityHint,
  parseQuantityText,
  quantityInputNotice,
  sanitizeQuantityText
} from '../../services/treasuryQuantity'
import { cn } from '../../utils/cn'
import { amountFieldClass } from '../ui/formControlStyles'
import { formControlClassName, formHintClass } from '../ui/formStyles'

/**
 * Quantity typed as text so «۲.» survives while the user types; the asset's catalog
 * decimals cap the fraction digits (none for whole units).
 */
export default function QuantityInput({
  value,
  decimals,
  onChange,
  className,
  ...aria
}: {
  value: number | ''
  decimals: number
  onChange: (value: number | '') => void
  /** Set by FormField. */
  id?: string
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const [text, setText] = useState(value === '' ? '' : String(value))
  // A dropped minus sign or «1e3»: told, like the money field does, instead of saved as another number.
  const [rejected, setRejected] = useState('')
  const noticeId = useId()
  const notice = rejected || largeQuantityHint(value)

  // Follow resets and asset changes from the form, not our own keystrokes.
  useEffect(() => {
    setText(current => (parseQuantityText(current) === value ? current : String(value)))
  }, [value])

  return (
    <div className={amountFieldClass}>
      <input
        {...aria}
        aria-describedby={
          notice ? `${noticeId} ${aria['aria-describedby'] ?? ''}`.trim() : aria['aria-describedby']
        }
        className={cn(formControlClassName(), className)}
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        dir="ltr"
        value={text}
        onChange={event => {
          const next = sanitizeQuantityText(event.target.value, decimals)

          setText(next)
          setRejected(quantityInputNotice(event.target.value))
          onChange(parseQuantityText(next))
        }}
        onBlur={() => setRejected('')}
        placeholder={decimals > 0 ? 'مثلاً ۲.۵' : 'مثلاً ۳'}
      />
      {notice ? (
        <p id={noticeId} role="status" className={formHintClass}>
          {notice}
        </p>
      ) : null}
    </div>
  )
}
