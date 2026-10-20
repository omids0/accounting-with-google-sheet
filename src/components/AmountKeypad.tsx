import { useEffect, useState, type ReactNode } from 'react'

import AppIcon from './AppIcon'
import PickerSheet from './form/PickerSheet'
import {
  keypadDisplayClass,
  keypadGridClass,
  keypadKeyClass,
  keypadQuickChipClass,
  keypadQuickRowClass,
  keypadUnitClass
} from './ui/amountKeypadStyles'
import Button from './ui/Button'
import { formActionsClassName } from './ui/formStyles'
import { formModalActionsClass } from './ui/modalStyles'
import {
  addToKeypad,
  KEYPAD_QUICK_ADDS,
  keypadKeyFromEvent,
  keypadNumber,
  pressKeypadKey,
  type KeypadKey
} from '../utils/amountKeypad'
import { cn } from '../utils/cn'
import { formatPersianNumber, getCurrencySymbol } from '../utils/formatMoney'
import { toPersianDigits } from '../utils/normalizeDigits'

interface AmountKeypadProps {
  open: boolean
  /** Title of the sheet: the name of the field being filled. */
  label: string
  value: number | ''
  onConfirm: (value: number) => void
  onClose: () => void
}

const DIGIT_KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** Round 11 dial pad: a bottom sheet with a digit grid, quick adds and a large live amount. */
export default function AmountKeypad({
  open,
  label,
  value,
  onConfirm,
  onClose
}: AmountKeypadProps) {
  const [digits, setDigits] = useState('')

  useEffect(() => {
    if (open) setDigits(value === '' || value === 0 ? '' : String(value))
    // The draft starts from the field's amount each time the pad opens, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // The hardware keyboard works too: digits and backspace edit, Enter confirms.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      const key = keypadKeyFromEvent(event.key)

      if (key) {
        setDigits(current => pressKeypadKey(current, key))
      } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        onConfirm(keypadNumber(digits))
      } else {
        return
      }
      event.preventDefault()
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, digits, onConfirm])

  const press = (key: KeypadKey) => setDigits(current => pressKeypadKey(current, key))

  const keyButton = (key: KeypadKey, content: ReactNode, ariaLabel?: string, alt = false) => (
    <button
      key={key}
      type="button"
      className={keypadKeyClass(alt)}
      aria-label={ariaLabel}
      onClick={() => press(key)}
    >
      {content}
    </button>
  )

  return (
    <PickerSheet
      open={open}
      title={label}
      onClose={onClose}
      footer={
        <div className={cn(formModalActionsClass, formActionsClassName(), '[&>button]:!w-auto')}>
          <Button type="button" variant="secondary" onClick={() => press('clear')}>
            پاک کردن
          </Button>
          <Button type="button" onClick={() => onConfirm(keypadNumber(digits))}>
            تأیید
          </Button>
        </div>
      }
    >
      <p className={keypadDisplayClass} aria-live="polite">
        {formatPersianNumber(keypadNumber(digits))}
        <small className={keypadUnitClass}>{getCurrencySymbol()}</small>
      </p>
      <div className={keypadQuickRowClass}>
        {KEYPAD_QUICK_ADDS.map(amount => (
          <button
            key={amount}
            type="button"
            className={keypadQuickChipClass}
            onClick={() => setDigits(current => addToKeypad(current, amount))}
          >
            +{formatPersianNumber(amount)}
          </button>
        ))}
      </div>
      <div className={keypadGridClass}>
        {DIGIT_KEYS.map(key => keyButton(key, toPersianDigits(key)))}
        {keyButton('000', toPersianDigits('000'), undefined, true)}
        {keyButton('0', toPersianDigits('0'))}
        {keyButton('back', <AppIcon name="back" size={22} />, 'حذف آخرین رقم', true)}
      </div>
    </PickerSheet>
  )
}
