import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useState } from 'react'

import {
  getBankSmsPermission,
  requestBankSmsPermission,
  setBankSmsCaptureEnabled
} from '../../services/bankSmsNative'
import { getBankSmsPrefs, updateBankSmsPrefs } from '../../services/bankSmsPrefs'
import { useBankSmsStore } from '../../stores/bankSmsStore'
import { showError, showSuccess } from '../../utils/toast'
import ToggleChipGroup from '../ToggleChipGroup'
import {
  smsActionsRowClass,
  smsCardClass,
  smsCardTitleClass,
  smsHintClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

const DAY_MS = 24 * 60 * 60 * 1000

const BACKFILL_OPTIONS = [
  { id: '1', label: 'دیروز' },
  { id: '3', label: '۳ روز' },
  { id: '7', label: '۷ روز' },
  { id: '30', label: '۳۰ روز' },
  { id: '90', label: '۹۰ روز' }
]

type BankSmsSettingsCardProps = {
  onChanged: () => void
}

/** On/off switch, permission state and «read older SMS» for bank SMS capture. */
export default function BankSmsSettingsCard({ onChanged }: BankSmsSettingsCardProps) {
  const scanFrom = useBankSmsStore(state => state.scanFrom)
  const [enabled, setEnabled] = useState(() => getBankSmsPrefs().enabled)
  const [granted, setGranted] = useState(true)
  const [busy, setBusy] = useState(false)
  const [days, setDays] = useState('7')

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
      // Start from now; older SMS are read only when the user asks below.
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

  const readOlder = async () => {
    setBusy(true)
    try {
      const added = await scanFrom(Date.now() - Number(days) * DAY_MS)

      showSuccess(added ? `${added} پیامک قبلی به صف اضافه شد` : 'پیامک تازه‌ای پیدا نشد')
    } catch {
      showError('خواندن پیامک‌های قبلی ممکن نشد')
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

      {enabled && granted && (
        <>
          <p className={smsHintClass}>پیامک‌های قبلی از:</p>
          {/* Chips instead of a dropdown: the dropdown menu was hidden under the next card. */}
          <ToggleChipGroup
            ariaLabel="بازه پیامک‌های قبلی"
            options={BACKFILL_OPTIONS}
            selected={{ [days]: true }}
            onToggle={setDays}
          />
          <div className={smsActionsRowClass}>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={readOlder}>
              خواندن پیامک‌های قبلی
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
