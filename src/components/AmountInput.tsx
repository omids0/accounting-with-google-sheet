import { useRef } from 'react'

import {
  amountFieldClass,
  amountFieldCompactClass,
  amountFieldCurrencyClass,
  amountFieldCurrencyCompactClass,
  amountFieldInputClass,
  amountFieldInputCompactClass,
  amountFieldInputWrapClass,
  amountFieldInputWrapCompactClass,
  amountFieldInputWrapInvalidClass,
  amountFieldSubmitBtnClass,
  amountFieldSubmitBtnLabelClass,
  amountWordsClass
} from './ui/formControlStyles'
import { cn } from '../utils/cn'
import { getCurrencySymbol } from '../utils/formatMoney'
import { normalizeDigits } from '../utils/normalizeDigits'
import { numberToPersianWords } from '../utils/numberToWords'

interface AmountInputProps {
  value: string | number
  onChange: (value: number | '') => void
  compact?: boolean
  onBlur?: () => void
  onSubmit?: () => void
  submitDisabled?: boolean
  id?: string
  invalid?: boolean
  /** When set, shown instead of the currency symbol (e.g. km). */
  unit?: string
  /** Hide Persian amount words (useful for non-money numeric fields). */
  hideWords?: boolean
}

function parseDigitInput(value: string): string {
  return normalizeDigits(value).replace(/[^\d]/g, '')
}

export default function AmountInput({
  value,
  onChange,
  compact = false,
  onBlur,
  onSubmit,
  submitDisabled = false,
  id,
  invalid = false,
  unit,
  hideWords = false
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const skipBlurRef = useRef(false)

  const raw = value === '' || value === undefined ? '' : String(Math.trunc(Number(value)))

  const display = raw ? Number(raw).toLocaleString('fa-IR') : ''

  const words = raw && !hideWords ? numberToPersianWords(Number(raw)) : ''

  const suffix = unit ?? getCurrencySymbol()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = parseDigitInput(e.target.value)

    onChange(digits === '' ? '' : Number(digits))
  }

  const handleBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false

      return
    }
    onBlur?.()
  }

  const handleSubmit = () => {
    if (!onSubmit || submitDisabled) return
    skipBlurRef.current = true
    inputRef.current?.blur()
    onSubmit()
  }

  const handleSubmitMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  if (compact) {
    return (
      <div className={cn(amountFieldClass, amountFieldCompactClass)}>
        <div
          className={cn(
            amountFieldInputWrapClass,
            amountFieldInputWrapCompactClass,
            invalid && amountFieldInputWrapInvalidClass
          )}
        >
          {onSubmit && (
            <button
              type="button"
              className={amountFieldSubmitBtnClass}
              onMouseDown={handleSubmitMouseDown}
              onClick={event => {
                event.stopPropagation()
                handleSubmit()
              }}
              disabled={submitDisabled}
              aria-label="تأیید مبلغ وارده"
              title="تأیید مبلغ"
            >
              <span className={amountFieldSubmitBtnLabelClass}>تأیید</span>
            </button>
          )}
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            dir="ltr"
            placeholder="۰"
            className={cn(amountFieldInputClass, amountFieldInputCompactClass, 'numeric')}
            aria-label={unit ? unit : 'مبلغ'}
          />
          <span className={cn(amountFieldCurrencyClass, amountFieldCurrencyCompactClass)}>
            {suffix}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={amountFieldClass}>
      <div className={cn(amountFieldInputWrapClass, invalid && amountFieldInputWrapInvalidClass)}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          dir="ltr"
          placeholder="۰"
          className={cn(amountFieldInputClass, 'numeric')}
          aria-label={unit ? unit : 'مبلغ'}
        />
        <span className={amountFieldCurrencyClass}>{suffix}</span>
      </div>
      {words && (
        <p className={amountWordsClass}>
          {words} {suffix}
        </p>
      )}
    </div>
  )
}
