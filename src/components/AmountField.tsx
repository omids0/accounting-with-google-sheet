import { useState } from 'react'

import AmountKeypad from './AmountKeypad'
import {
  amountFieldButtonClass,
  amountFieldPlaceholderClass,
  amountFieldUnitClass,
  amountFieldValueClass
} from './ui/amountKeypadStyles'
import { amountFieldClass, amountWordsClass } from './ui/formControlStyles'
import { formControlInvalidClass } from './ui/formStyles'
import { cn } from '../utils/cn'
import { formatPersianNumber, getCurrencySymbol } from '../utils/formatMoney'
import { numberToPersianWords } from '../utils/numberToWords'

interface AmountFieldProps {
  value: string | number
  onChange: (value: number | '') => void
  /** Name of the field; titles the dial pad and labels the button. */
  label: string
  id?: string
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  /** Hide the amount in words under the button. */
  hideWords?: boolean
}

/**
 * Round 11 money field: a button that shows the amount and opens the dial pad, in place of the
 * typed `AmountInput`. Counts, areas, phones and cards stay plain inputs.
 */
export default function AmountField({
  value,
  onChange,
  label,
  id,
  placeholder = 'مبلغ را وارد کنید',
  invalid = false,
  disabled = false,
  hideWords = false
}: AmountFieldProps) {
  const [open, setOpen] = useState(false)

  const amount = value === '' || value === undefined ? 0 : Math.trunc(Number(value)) || 0

  const symbol = getCurrencySymbol()

  return (
    <div className={amountFieldClass}>
      <button
        id={id}
        type="button"
        className={cn(amountFieldButtonClass, invalid && formControlInvalidClass)}
        aria-label={amount ? `${label}: ${formatPersianNumber(amount)} ${symbol}` : label}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {amount ? (
          <>
            <b className={amountFieldValueClass}>{formatPersianNumber(amount)}</b>
            <span className={amountFieldUnitClass}>{symbol}</span>
          </>
        ) : (
          <span className={amountFieldPlaceholderClass}>{placeholder}</span>
        )}
      </button>
      {amount > 0 && !hideWords && (
        <p className={amountWordsClass}>
          {numberToPersianWords(amount)} {symbol}
        </p>
      )}
      <AmountKeypad
        open={open}
        label={label}
        value={amount || ''}
        onClose={() => setOpen(false)}
        onConfirm={next => {
          onChange(next)
          setOpen(false)
        }}
      />
    </div>
  )
}
