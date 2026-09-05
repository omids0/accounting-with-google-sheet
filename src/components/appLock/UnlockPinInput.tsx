import { type KeyboardEvent } from 'react'

import { cn } from '../../utils/cn'
import {
  unlockHiddenInputClass,
  unlockPinCellClass,
  unlockPinCellsClass,
  unlockPinDotClass,
  unlockPinLabelClass,
  unlockPinSectionClass
} from '../ui/unlockStyles'

const PIN_LENGTH = 4

interface UnlockPinInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hasError?: boolean
  autoFocus?: boolean
}

export default function UnlockPinInput({
  id,
  value,
  onChange,
  disabled,
  hasError,
  autoFocus
}: UnlockPinInputProps) {
  const digits = value.padEnd(PIN_LENGTH, ' ').slice(0, PIN_LENGTH).split('')

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value) {
      event.preventDefault()
    }
  }

  return (
    <div className={unlockPinSectionClass}>
      <span className={unlockPinLabelClass} id={`${id}-label`}>
        رمز ورود
      </span>

      <label className={unlockPinCellsClass} htmlFor={id} aria-labelledby={`${id}-label`} dir="ltr">
        {digits.map((digit, index) => {
          const filled = digit.trim().length > 0
          const active = !disabled && value.length === index

          return (
            <span
              key={index}
              className={unlockPinCellClass({
                filled,
                active,
                error: hasError
              })}
              aria-hidden="true"
            >
              {filled && <span className={unlockPinDotClass} />}
            </span>
          )
        })}
      </label>

      <input
        id={id}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={PIN_LENGTH}
        value={value}
        disabled={disabled}
        dir="ltr"
        className={cn(unlockHiddenInputClass)}
        onChange={event => {
          onChange(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))
        }}
        onKeyDown={handleKeyDown}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
      />
    </div>
  )
}
