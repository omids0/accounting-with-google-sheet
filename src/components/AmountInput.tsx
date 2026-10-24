import { useId, useRef, useState } from 'react'

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
import { formErrorClass, formHintClass } from './ui/formStyles'
import {
  AMOUNT_INTEGER_ONLY_HINT,
  AMOUNT_MAX_MESSAGE,
  parseAmountInput
} from '../utils/amountInput'
import { cn } from '../utils/cn'
import { formatPersianNumber, getCurrencySymbol } from '../utils/formatMoney'
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
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  /** When set, shown instead of the currency symbol (e.g. km). */
  unit?: string
  /** Hide Persian amount words (useful for non-money numeric fields). */
  hideWords?: boolean
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
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  unit,
  hideWords = false
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const skipBlurRef = useRef(false)

  const raw = value === '' || value === undefined ? '' : String(Math.trunc(Number(value)))

  const display = raw ? formatPersianNumber(Number(raw)) : ''

  const words = raw && !hideWords ? numberToPersianWords(Number(raw)) : ''

  const suffix = unit ?? getCurrencySymbol()

  const [notice, setNotice] = useState<'integer' | 'max' | null>(null)

  const noticeId = useId()

  const noticeText =
    notice === 'max' ? (unit ? 'عدد خیلی بزرگ است' : AMOUNT_MAX_MESSAGE) : AMOUNT_INTEGER_ONLY_HINT

  const describedBy = notice ? `${noticeId} ${ariaDescribedBy ?? ''}`.trim() : ariaDescribedBy

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { digits, cutDecimal, overMax } = parseAmountInput(e.target.value)

    setNotice(overMax ? 'max' : cutDecimal ? 'integer' : null)
    // Past the maximum the field keeps what it had; it stops taking digits.
    if (overMax) return
    onChange(digits === '' ? '' : Number(digits))
  }

  const noticeLine = notice ? (
    <p
      id={noticeId}
      role={notice === 'max' ? 'alert' : 'status'}
      className={notice === 'max' ? formErrorClass : formHintClass}
    >
      {noticeText}
    </p>
  ) : null

  const handleBlur = () => {
    setNotice(null)
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
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy}
          />
          <span className={cn(amountFieldCurrencyClass, amountFieldCurrencyCompactClass)}>
            {suffix}
          </span>
        </div>
        {noticeLine}
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
          aria-invalid={ariaInvalid}
          aria-describedby={describedBy}
        />
        <span className={amountFieldCurrencyClass}>{suffix}</span>
      </div>
      {noticeLine}
      {words && (
        <p className={amountWordsClass}>
          {words} {suffix}
        </p>
      )}
    </div>
  )
}
