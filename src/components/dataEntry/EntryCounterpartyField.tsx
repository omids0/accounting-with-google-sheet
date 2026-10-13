import { useEffect, useRef } from 'react'

import { useRecordInputs } from '../../hooks/useRecordInputs'
import { suggestCounterparty } from '../../services/recordCounterparty'
import AppIcon from '../AppIcon'
import { useCounterpartyList } from '../counterparties/useCounterpartyList'
import { CounterpartySelect, FormField } from '../form'
import { counterpartyClearButtonClass, counterpartyFieldRowClass } from '../ui/lineItemStyles'

interface EntryCounterpartyFieldProps {
  value: string
  category: string
  title: string
  disabled?: boolean
  /** Prefill from the newest record with the same category and title (new records only). */
  autoSuggest?: boolean
  onChange: (name: string) => void
}

/** Optional «طرف حساب» of an income/expense record: the shared picker, a ✕ and a prefill. */
export default function EntryCounterpartyField({
  value,
  category,
  title,
  disabled = false,
  autoSuggest = true,
  onChange
}: EntryCounterpartyFieldProps) {
  const [counterparties, setCounterparties] = useCounterpartyList()

  const records = useRecordInputs(autoSuggest)

  // Once the user picked or cleared a name, the prefill stays out of the way.
  const touchedRef = useRef(false)

  useEffect(() => {
    if (!autoSuggest || touchedRef.current || value) return

    const suggestion = suggestCounterparty(records, category, title)

    if (suggestion) onChange(suggestion)
  }, [autoSuggest, records, category, title, value, onChange])

  const pick = (name: string) => {
    touchedRef.current = true
    onChange(name)
  }

  return (
    <FormField label="طرف حساب" hint="اختیاری" controlWidth="full">
      <div className={counterpartyFieldRowClass}>
        <CounterpartySelect
          value={value}
          onChange={pick}
          counterparties={counterparties}
          onCounterpartiesChange={setCounterparties}
          disabled={disabled}
          aria-label="طرف حساب"
          placeholder="انتخاب کن…"
        />
        {value && !disabled ? (
          <button
            type="button"
            className={counterpartyClearButtonClass}
            onClick={() => pick('')}
            aria-label="پاک کردن طرف حساب"
          >
            <AppIcon name="close" size={16} />
          </button>
        ) : null}
      </div>
    </FormField>
  )
}
