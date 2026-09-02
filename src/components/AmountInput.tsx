import { useRef } from 'react'

import AppIcon from './AppIcon'
import { getCurrencySymbol } from '../utils/formatMoney'
import { numberToPersianWords } from '../utils/numberToWords'

interface AmountInputProps {
  value: string | number
  onChange: (value: number | '') => void
  compact?: boolean
  onBlur?: () => void
  onSubmit?: () => void
  submitDisabled?: boolean
  id?: string
}

function parseDigitInput(value: string): string {
  return value
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '')
}

export default function AmountInput({
  value,
  onChange,
  compact = false,
  onBlur,
  onSubmit,
  submitDisabled = false,
  id
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const skipBlurRef = useRef(false)

  const raw = value === '' || value === undefined ? '' : String(Math.trunc(Number(value)))

  const display = raw ? Number(raw).toLocaleString('fa-IR') : ''

  const words = raw ? numberToPersianWords(Number(raw)) : ''

  const currency = getCurrencySymbol()

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
      <div className="amount-field amount-field--compact">
        <div className="amount-field-input-wrap amount-field-input-wrap--compact">
          {onSubmit && (
            <button
              type="button"
              className="amount-field-submit-btn"
              onMouseDown={handleSubmitMouseDown}
              onClick={event => {
                event.stopPropagation()
                handleSubmit()
              }}
              disabled={submitDisabled}
              aria-label="ثبت"
            >
              <AppIcon name="check" size={14} strokeWidth={2.5} />
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
            className="amount-field-input amount-input-compact numeric"
            aria-label="مبلغ"
          />
          <span className="amount-field-currency">{currency}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="amount-field">
      <div className="amount-field-input-wrap">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          dir="ltr"
          placeholder="۰"
          className="amount-field-input numeric"
          aria-label="مبلغ"
        />
        <span className="amount-field-currency">{currency}</span>
      </div>
      {words && (
        <p className="amount-words">
          {words} {currency}
        </p>
      )}
    </div>
  )
}
