import { useCallback } from 'react'

import { formatCardNumberInput, normalizeCardNumber } from './walletCardUtils'
import { cn } from '../../utils/cn'
import { formControlClassName, formControlInvalidClass } from '../ui/formStyles'

type WalletCardNumberInputProps = {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  id?: string
}

export default function WalletCardNumberInput({
  value,
  onChange,
  invalid,
  disabled,
  id
}: WalletCardNumberInputProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(normalizeCardNumber(event.target.value))
    },
    [onChange]
  )

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      disabled={disabled}
      value={formatCardNumberInput(value)}
      onChange={handleChange}
      placeholder="0000 0000 0000 0000"
      maxLength={19}
      className={cn(
        formControlClassName('font-numeric tabular-nums tracking-[0.08em]'),
        invalid && formControlInvalidClass
      )}
    />
  )
}
