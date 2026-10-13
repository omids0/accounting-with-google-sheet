import { useEffect, useState } from 'react'

import { parseQuantityText, sanitizeQuantityText } from '../../services/treasuryQuantity'
import { cn } from '../../utils/cn'
import { formControlClassName } from '../ui/formStyles'

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

  // Follow resets and asset changes from the form, not our own keystrokes.
  useEffect(() => {
    setText(current => (parseQuantityText(current) === value ? current : String(value)))
  }, [value])

  return (
    <input
      {...aria}
      className={cn(formControlClassName(), className)}
      type="text"
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      dir="ltr"
      value={text}
      onChange={event => {
        const next = sanitizeQuantityText(event.target.value, decimals)

        setText(next)
        onChange(parseQuantityText(next))
      }}
      placeholder={decimals > 0 ? 'مثلاً ۲.۵' : 'مثلاً ۳'}
    />
  )
}
