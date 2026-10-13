import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

import { useRecordInputs } from '../../hooks/useRecordInputs'
import { suggestItemNames } from '../../services/recordLineItems'
import { formatMoney, formatPersianNumber } from '../../utils/formatMoney'
import { haptic } from '../../utils/haptics'
import { lineItemAmount, parseItemQuantity, type LineItem } from '../../utils/lineItems'
import { normalizeSearchText } from '../../utils/search'
import AmountInput from '../AmountInput'
import FormField from '../form/FormField'
import FormRow from '../form/FormRow'
import FormModal from '../FormModal'
import {
  lineItemSheetRemainderButtonClass,
  lineItemSheetRemainderRowClass,
  lineItemSuggestionClass,
  lineItemSuggestionsClass
} from '../ui/lineItemStyles'

interface LineItemSheetProps {
  open: boolean
  /** The item being edited, or null for a new one. */
  editing: LineItem | null
  /** Position shown in the title: «قلم N». */
  position: number
  category: string
  recordAmount: number
  /** Amount no item covers yet; null while the record amount is empty. */
  remainder: number | null
  onSave: (item: LineItem) => void
  onClose: () => void
}

export default function LineItemSheet({
  open,
  editing,
  position,
  category,
  recordAmount,
  remainder,
  onSave,
  onClose
}: LineItemSheetProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  /** Set once the amount was typed (or came from a saved item): «مقدار × فی» stops filling it. */
  const [amountTouched, setAmountTouched] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  const amountId = useId()

  const records = useRecordInputs(open)

  const reset = (item: LineItem | null) => {
    setName(item?.name ?? '')
    setAmount(item ? item.amount : '')
    setNote(item?.note ?? '')
    setUnitPrice(item?.unitPrice ?? '')
    setAmountTouched(item ? item.amount !== lineItemAmount(item.quantity, item.unitPrice) : false)
    setShowErrors(false)
  }

  useEffect(() => {
    if (!open) return

    reset(editing)
    nameRef.current?.focus()
  }, [open, editing])

  const typed = normalizeSearchText(name)

  const suggestions = open
    ? suggestItemNames(records, category).filter(
        suggestion => !typed || normalizeSearchText(suggestion).includes(typed)
      )
    : []

  const quantity = parseItemQuantity(note)?.value
  const computed = lineItemAmount(quantity, unitPrice === '' ? undefined : unitPrice)

  /** Quantity or «فی» changed: the amount follows them until it is edited by hand. */
  const applyComputed = (nextNote: string, nextPrice: number | '') => {
    setNote(nextNote)
    setUnitPrice(nextPrice)

    const next = lineItemAmount(
      parseItemQuantity(nextNote)?.value,
      nextPrice === '' ? undefined : nextPrice
    )

    if (!amountTouched && next > 0) setAmount(next)
  }

  const isValid = name.trim() !== '' && amount !== '' && amount > 0

  const save = (keepOpen: boolean) => {
    if (!isValid) {
      setShowErrors(true)

      return
    }

    onSave({
      name: name.trim(),
      amount: Number(amount),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(unitPrice !== '' && unitPrice > 0 ? { unitPrice } : {}),
      ...(quantity && quantity > 0 ? { quantity } : {})
    })
    haptic('light')

    if (keepOpen && !editing) {
      reset(null)
      nameRef.current?.focus()
    } else {
      onClose()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    save(true)
  }

  // «افزودن و بستن» with nothing typed is just a close.
  const handleSecondAction = () => {
    if (!editing && !name.trim() && amount === '' && !note.trim()) onClose()
    else save(false)
  }

  const nameError = showErrors && !name.trim() ? 'نام قلم را بنویس' : undefined

  const amountError = showErrors && !(amount !== '' && amount > 0) ? 'مبلغ قلم را بنویس' : undefined

  return (
    <FormModal
      open={open}
      variant="panel"
      title={
        editing
          ? `ویرایش قلم ${formatPersianNumber(position)}`
          : `قلم ${formatPersianNumber(position)}`
      }
      onClose={onClose}
      onSubmit={handleSubmit}
      saveLabel={editing ? 'ذخیره قلم' : 'افزودن و قلم بعدی'}
      cancelLabel={editing ? 'انصراف' : 'افزودن و بستن'}
      onCancel={editing ? onClose : handleSecondAction}
    >
      {recordAmount > 0 ? (
        <p className={lineItemSheetRemainderRowClass}>
          {`از مبلغ ${formatMoney(recordAmount)}`}
          {remainder !== null && remainder > 0 ? (
            <>
              {' · '}
              <button
                type="button"
                className={lineItemSheetRemainderButtonClass}
                onClick={() => {
                  setAmount(remainder)
                  setAmountTouched(true)
                }}
                aria-label={`پر کردن مبلغ با مانده ${formatMoney(remainder)}`}
              >
                {`${formatPersianNumber(remainder)} مانده`}
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      <FormField label="نام قلم" required controlWidth="full" error={nameError}>
        <input
          ref={nameRef}
          type="text"
          value={name}
          autoComplete="off"
          placeholder="مثلاً: کیوی"
          onChange={event => setName(event.target.value)}
          onKeyDown={event => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            document.getElementById(amountId)?.focus()
          }}
        />
      </FormField>
      {suggestions.length ? (
        <div className={lineItemSuggestionsClass} aria-label="پیشنهاد نام قلم">
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              className={lineItemSuggestionClass}
              onClick={() => {
                setName(suggestion)
                document.getElementById(amountId)?.focus()
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <FormRow>
        <FormField label="مقدار" hint="اختیاری؛ مثلاً ۵ کیلو" controlWidth="full">
          <input
            type="text"
            value={note}
            autoComplete="off"
            placeholder="۵ کیلو"
            onChange={event => applyComputed(event.target.value, unitPrice)}
          />
        </FormField>
        <FormField label="فی" hint="قیمت یک واحد" controlWidth="full">
          <AmountInput value={unitPrice} onChange={next => applyComputed(note, next)} />
        </FormField>
      </FormRow>

      <FormField
        label="مبلغ"
        required
        controlWidth="full"
        error={amountError}
        hint={
          computed > 0 && quantity && unitPrice !== ''
            ? `= ${formatPersianNumber(quantity)} × ${formatPersianNumber(unitPrice)}`
            : undefined
        }
      >
        <AmountInput
          id={amountId}
          value={amount}
          onChange={next => {
            setAmount(next)
            setAmountTouched(true)
          }}
          invalid={Boolean(amountError)}
        />
      </FormField>
    </FormModal>
  )
}
