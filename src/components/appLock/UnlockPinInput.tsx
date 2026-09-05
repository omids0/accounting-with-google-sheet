import { type KeyboardEvent, useEffect, useRef, useState } from 'react'

import { cn } from '../../utils/cn'
import { appLockPinFieldProps } from '../ui/appLockStyles'
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
  onComplete?: (value: string) => void
  disabled?: boolean
  hasError?: boolean
  autoFocus?: boolean
}

export default function UnlockPinInput({
  id,
  value,
  onChange,
  onComplete,
  disabled,
  hasError,
  autoFocus
}: UnlockPinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputReady, setInputReady] = useState(false)
  const digits = value.padEnd(PIN_LENGTH, ' ').slice(0, PIN_LENGTH).split('')

  const activateInput = () => {
    if (disabled || inputReady) return

    setInputReady(true)
  }

  useEffect(() => {
    if (!inputReady || disabled) return

    inputRef.current?.focus()
  }, [disabled, inputReady])

  const handleChange = (nextValue: string) => {
    onChange(nextValue)

    if (nextValue.length === PIN_LENGTH) {
      onComplete?.(nextValue)
    }
  }

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

      <label
        className={unlockPinCellsClass}
        htmlFor={id}
        aria-labelledby={`${id}-label`}
        dir="ltr"
        onPointerDown={event => {
          event.preventDefault()
          activateInput()
        }}
      >
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
        ref={inputRef}
        id={id}
        {...appLockPinFieldProps}
        name="acct-app-lock-code"
        autoFocus={autoFocus}
        maxLength={PIN_LENGTH}
        value={value}
        disabled={disabled}
        readOnly={!inputReady}
        dir="ltr"
        className={cn(unlockHiddenInputClass)}
        onChange={event => {
          handleChange(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))
        }}
        onKeyDown={handleKeyDown}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
      />
    </div>
  )
}
