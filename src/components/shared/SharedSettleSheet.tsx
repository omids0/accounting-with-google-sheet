import { useState } from 'react'

import type { SharedRecords } from './useSharedRecords'
import { suggestSettlement } from '../../services/sharedSettlement'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountField from '../AmountField'
import { FormField, Select } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import { alertClassName } from '../ui/Alert'
import { sharedAlertClass } from '../ui/sharedStyles'

interface SharedSettleSheetProps {
  shared: SharedRecords
  onClose: () => void
}

/**
 * «ثبت تسویه»: who paid whom and how much, prefilled from the balance, and the date. It writes one
 * «تسویه» record and names no wallet account: it moves no money by itself (unlike the wallet
 * settle sheet, which is not reused for that reason).
 */
export default function SharedSettleSheet({ shared, onClose }: SharedSettleSheetProps) {
  const pair = shared.pair
  const suggestion = shared.balance ? suggestSettlement(shared.balance.net) : null
  const [from, setFrom] = useState(suggestion?.from ?? pair?.[0] ?? '')
  const [amount, setAmount] = useState<number | ''>(suggestion?.amount ?? '')
  const [date, setDate] = useState(getTodayIso())
  const [saving, setSaving] = useState(false)

  if (!pair) return null

  const to = pair.find(email => email !== from) ?? pair[1]
  const value = Number(amount) || 0
  const clears = !!suggestion && suggestion.from === from && suggestion.amount === value

  const submit = async () => {
    setSaving(true)

    const saved = await shared.settle(from, to, value, date)

    setSaving(false)
    if (saved) onClose()
  }

  return (
    <FormModal
      open
      title="ثبت تسویه"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        return submit()
      }}
      saving={saving}
      saveDisabled={!(value > 0)}
      saveLabel="تأیید تسویه"
    >
      <FormField label="چه کسی به چه کسی داد؟" controlWidth="full">
        <Select
          aria-label="چه کسی به چه کسی داد؟"
          value={from}
          onChange={setFrom}
          options={pair.map(email => ({
            value: email,
            label: `${shared.nameOf(email)} به ${shared.nameOf(
              pair.find(other => other !== email) ?? email
            )}`
          }))}
        />
      </FormField>
      <FormField label="مبلغ (تومان)" required controlWidth="full">
        <AmountField label="مبلغ تسویه" value={amount} onChange={setAmount} />
      </FormField>
      <FormField label="تاریخ" controlWidth="full">
        <JalaliDatePicker value={date} onChange={setDate} />
      </FormField>
      <p className={alertClassName('info', sharedAlertClass)}>
        {`این فقط یک ثبت است و پولی جابه‌جا نمی‌کند.${
          clears ? ' بعد از ثبت، تراز صفر می‌شود.' : ''
        }`}
      </p>
    </FormModal>
  )
}
