import { useState } from 'react'

import { formatSmsTime } from './smsLabels'
import {
  getBankSmsPermission,
  listBankSmsInbox,
  requestBankSmsPermission,
  type BankSmsItem
} from '../../services/bankSmsNative'
import { showError } from '../../utils/toast'
import { smsHintClass, smsInboxItemClass, smsInboxListClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'

type SmsInboxPickerProps = {
  onPick: (body: string) => void
}

/** Android only: pick the sample from recent bank-like SMS instead of pasting it. */
export default function SmsInboxPicker({ onPick }: SmsInboxPickerProps) {
  const [items, setItems] = useState<BankSmsItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  const open = async () => {
    setLoading(true)
    try {
      const granted =
        (await getBankSmsPermission()) === 'granted' ||
        (await requestBankSmsPermission()) === 'granted'

      if (!granted) {
        showError('برای خواندن پیامک‌ها اجازه دسترسی لازم است')

        return
      }
      setItems(await listBankSmsInbox(30))
    } catch {
      showError('خواندن پیامک‌ها ممکن نشد')
    } finally {
      setLoading(false)
    }
  }

  if (!items) {
    return (
      <Button type="button" variant="secondary" size="sm" loading={loading} onClick={open}>
        انتخاب از پیامک‌ها
      </Button>
    )
  }

  if (!items.length) return <p className={smsHintClass}>پیامک بانکی در گوشی پیدا نشد.</p>

  return (
    <ul className={smsInboxListClass} aria-label="پیامک‌های بانکی اخیر">
      {items.map(item => (
        <li key={item.id}>
          <button
            type="button"
            className={smsInboxItemClass}
            onClick={() => {
              onPick(item.body)
              setItems(null)
            }}
          >
            <span className={smsHintClass}>
              {item.sender} · {formatSmsTime(item.receivedAt)}
            </span>
            <br />
            {item.body}
          </button>
        </li>
      ))}
    </ul>
  )
}
