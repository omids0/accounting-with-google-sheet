import { useEffect, useState } from 'react'

import type { OnboardingStepProps } from './onboardingSteps'
import { BANK_SMS_ENABLE_MESSAGES, enableBankSmsCapture } from '../../services/bankSmsEnable'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { showError, showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import {
  onboardingSavedNoteClass,
  onboardingSubtitleClass,
  onboardingTitleClass
} from '../ui/onboardingStyles'

export default function OnboardingSmsStep({ onReadyChange }: OnboardingStepProps) {
  const [enabled, setEnabled] = useState(() => getBankSmsPrefs().enabled)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    onReadyChange(enabled)
  }, [enabled, onReadyChange])

  const enable = async () => {
    setBusy(true)
    try {
      const result = await enableBankSmsCapture()

      if (result !== 'enabled') {
        showError(BANK_SMS_ENABLE_MESSAGES[result])

        return
      }
      setEnabled(true)
      showSuccess(BANK_SMS_ENABLE_MESSAGES.enabled)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div>
        <h2 className={onboardingTitleClass}>ثبت خودکار از پیامک بانکی</h2>
        <p className={onboardingSubtitleClass}>
          پیامک‌های بانکت خودکار به تراکنش پیشنهادی تبدیل می‌شوند و فقط با یک لمس ثبت می‌شوند. برای
          این کار اجازه خواندن پیامک لازم است؛ متن پیامک‌ها فقط روی همین گوشی می‌ماند.
        </p>
      </div>

      {enabled ? (
        <p className={onboardingSavedNoteClass} role="status">
          <AppIcon name="check" size={18} />
          پیامک بانکی فعال شد.
        </p>
      ) : (
        <Button type="button" variant="secondary" loading={busy} onClick={enable}>
          <AppIcon name="bell" size={18} />
          دادن اجازه پیامک
        </Button>
      )}
    </>
  )
}
