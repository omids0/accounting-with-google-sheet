import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import BankSmsHelp from './BankSmsHelp'
import { useWorkspaceType } from '../../hooks/useWorkspaceType'
import { SETTINGS_REMINDERS_PATH } from '../../routes/paths'
import { BANK_SMS_ENABLE_MESSAGES, enableBankSmsCapture } from '../../services/bankSmsEnable'
import { getBankSmsPermission, setBankSmsCaptureEnabled } from '../../services/bankSmsNative'
import { getBankSmsPrefs, updateBankSmsPrefs } from '../../services/bankSmsPrefs'
import { getNotificationPermission } from '../../services/localNotifications'
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
  const [notifyAllowed, setNotifyAllowed] = useState(true)
  const navigate = useNavigate()
  // The reminders page exists only in the personal sheet; a building has no link to it.
  const isPersonal = useWorkspaceType() === 'personal'

  useEffect(() => {
    void getBankSmsPermission()
      .then(state => setGranted(state === 'granted'))
      .catch(() => {})
    void getNotificationPermission()
      .then(state => setNotifyAllowed(state === 'granted'))
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
      <BankSmsHelp />

      {enabled && !granted && (
        <p className={smsHintClass}>اجازه دسترسی به پیامک‌ها لغو شده است؛ دوباره اجازه دهید.</p>
      )}

      {enabled && !notifyAllowed && isPersonal && (
        <p className={smsHintClass}>
          برای اینکه شب‌ها از پیامک‌های ثبت‌نشده خبردار شوید، «جمع‌بندی شبانه» را در یادآوری‌ها روشن
          کنید.{' '}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => navigate(SETTINGS_REMINDERS_PATH)}
          >
            یادآوری‌ها
          </Button>
        </p>
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
