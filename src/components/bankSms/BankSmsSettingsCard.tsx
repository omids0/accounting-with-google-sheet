import { useEffect, useState } from 'react'

import { BANK_SMS_ENABLE_MESSAGES, enableBankSmsCapture } from '../../services/bankSmsEnable'
import { getBankSmsPermission, setBankSmsCaptureEnabled } from '../../services/bankSmsNative'
import { getBankSmsPrefs, updateBankSmsPrefs } from '../../services/bankSmsPrefs'
import { showError, showSuccess } from '../../utils/toast'
import {
  smsActionsRowClass,
  smsCardClass,
  smsCardTitleClass,
  smsHintClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

type BankSmsSettingsCardProps = {
  onChanged: () => void
}

/** On/off switch and permission state for bank SMS capture. */
export default function BankSmsSettingsCard({ onChanged }: BankSmsSettingsCardProps) {
  const [enabled, setEnabled] = useState(() => getBankSmsPrefs().enabled)
  const [granted, setGranted] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getBankSmsPermission()
      .then(state => setGranted(state === 'granted'))
      .catch(() => {})
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const result = await enableBankSmsCapture()

      if (result === 'denied') setGranted(false)
      if (result !== 'enabled') {
        showError(BANK_SMS_ENABLE_MESSAGES[result])

        return
      }
      setGranted(true)
      setEnabled(true)
      showSuccess(BANK_SMS_ENABLE_MESSAGES.enabled)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await setBankSmsCaptureEnabled(false)
      updateBankSmsPrefs({ enabled: false })
      setEnabled(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={smsCardClass}>
      <h2 className={smsCardTitleClass}>ثبت خودکار از پیامک بانکی</h2>
      <p className={smsHintClass}>
        ۱) برای هر بانک یک‌بار قالب بسازید: روی «ساخت قالب» یک پیامک بزنید (یا از کیف پول ← ویرایش
        حساب). بقیه پیامک‌های همان شکل خودکار شناخته می‌شوند. ۲) روی هر کارت شناخته‌شده «ثبت هزینه»
        یا «ثبت درآمد» را بزنید (یا «ثبت همه»)؛ همان لحظه در درآمد/هزینه ثبت و موجودی حساب به‌روز
        می‌شود. اگر تراکنش را قبلاً دستی ثبت کرده‌اید: «فقط به‌روزرسانی موجودی» فقط موجودی حساب را
        درست می‌کند و «قبلاً ثبت شده» پیامک را بدون هیچ تغییری از لیست خارج می‌کند. مبلغ ریالی پیامک
        خودکار به واحد اپ تبدیل می‌شود. متن پیامک‌ها فقط روی همین گوشی می‌ماند.
      </p>

      {enabled && !granted && (
        <p className={smsHintClass}>اجازه دسترسی به پیامک‌ها لغو شده است؛ دوباره اجازه دهید.</p>
      )}

      <div className={smsActionsRowClass}>
        {enabled ? (
          <Button type="button" size="sm" variant="secondary" loading={busy} onClick={disable}>
            غیرفعال‌سازی
          </Button>
        ) : (
          <Button type="button" size="sm" loading={busy} onClick={enable}>
            فعال‌سازی
          </Button>
        )}
        {enabled && !granted && (
          <Button type="button" size="sm" disabled={busy} onClick={enable}>
            اجازه دادن
          </Button>
        )}
      </div>
    </Card>
  )
}
