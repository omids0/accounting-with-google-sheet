import { type KeyboardEvent, useEffect, useRef, useState } from 'react'

import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '../../services/appLock'
import { cn } from '../../utils/cn'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { appLockPinFieldProps } from '../ui/appLockStyles'
import {
  unlockHiddenInputClass,
  unlockPinCellClass,
  unlockPinCellsClass,
  unlockPinDotClass,
  unlockPinLabelClass,
  unlockPinSectionClass
} from '../ui/unlockStyles'

interface UnlockPinInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  /**
   * Digits in the stored PIN. With a known length the field auto-submits once
   * full; with `null` (length unknown) it grows and waits for the submit button.
   */
  length?: number | null
  disabled?: boolean
  hasError?: boolean
  autoFocus?: boolean
}

export default function UnlockPinInput({
  id,
  value,
  onChange,
  onComplete,
  length = PIN_MIN_LENGTH,
  disabled,
  hasError,
  autoFocus
}: UnlockPinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputReady, setInputReady] = useState(false)
  const maxLength = length ?? PIN_MAX_LENGTH
  const cellCount = length ?? Math.min(PIN_MAX_LENGTH, Math.max(PIN_MIN_LENGTH, value.length + 1))
  const digits = value.padEnd(cellCount, ' ').slice(0, cellCount).split('')

  const activateInput = () => {
    if (disabled || inputReady) return

    setInputReady(true)
  }

  useEffect(() => {
    if (!autoFocus || disabled) return

    setInputReady(true)
  }, [autoFocus, disabled])

  useEffect(() => {
    if (!inputReady || disabled) return

    inputRef.current?.focus({ preventScroll: true })
  }, [disabled, inputReady])

  const handleChange = (nextValue: string) => {
    onChange(nextValue)

    if (length && nextValue.length === length) {
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
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        readOnly={!inputReady}
        dir="ltr"
        className={cn(unlockHiddenInputClass)}
        onChange={event => {
          handleChange(normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, maxLength))
        }}
        onKeyDown={handleKeyDown}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
      />
    </div>
  )
}
