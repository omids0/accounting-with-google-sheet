import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useState } from 'react'

import {
  getBankSmsPermission,
  requestBankSmsPermission,
  setBankSmsCaptureEnabled
} from '../../services/bankSmsNative'
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
      const allowed = (await requestBankSmsPermission()) === 'granted'

      setGranted(allowed)
      if (!allowed) {
        showError('بدون اجازه دسترسی به پیامک‌ها این قابلیت کار نمی‌کند')

        return
      }
      await LocalNotifications.requestPermissions().catch(() => undefined)
      await setBankSmsCaptureEnabled(true)
      // Start from now; older SMS are read for the range chosen on the page.
      updateBankSmsPrefs({ enabled: true, lastScanAt: Date.now() })
      setEnabled(true)
      showSuccess('ثبت از پیامک بانکی فعال شد')
      onChanged()
    } catch {
      showError('فعال‌سازی ممکن نشد')
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
