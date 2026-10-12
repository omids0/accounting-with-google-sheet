import { requestBankSmsPermission, setBankSmsCaptureEnabled } from './bankSmsNative'
import { updateBankSmsPrefs } from './bankSmsPrefs'

export type BankSmsEnableResult = 'enabled' | 'denied' | 'failed'

/**
 * Asks for SMS permission and turns capture on from now. Notification permission is asked
 * separately, with its own reason, from the nightly digest on the reminders page.
 */
export async function enableBankSmsCapture(): Promise<BankSmsEnableResult> {
  try {
    if ((await requestBankSmsPermission()) !== 'granted') return 'denied'

    await setBankSmsCaptureEnabled(true)
    // Start from now; older SMS are read for the range chosen on the page.
    updateBankSmsPrefs({ enabled: true, lastScanAt: Date.now() })

    return 'enabled'
  } catch {
    return 'failed'
  }
}

export const BANK_SMS_ENABLE_MESSAGES = {
  enabled: 'ثبت از پیامک بانکی فعال شد',
  denied: 'بدون اجازه دسترسی به پیامک‌ها این قابلیت کار نمی‌کند',
  failed: 'فعال‌سازی ممکن نشد'
} as const satisfies Record<BankSmsEnableResult, string>
