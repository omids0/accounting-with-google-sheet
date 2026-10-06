import { useEffect, useReducer } from 'react'
import { useNavigate } from 'react-router'

import { isAppLockEnabled } from '../../services/appLock'
import {
  APP_LOCK_PROMPT_EVENT,
  dismissLockSetupOffer,
  dismissPinUpgrade,
  isLockSetupOffered,
  isPinUpgradePending
} from '../../services/appLockPrompts'
import ConfirmActionModal from '../ConfirmActionModal'

const SETTINGS_PATH = '/settings'

/**
 * Lock nudges shown over the app: upgrading a short (4–5 digit) PIN, once per
 * session, and setting a new PIN after a forgotten-PIN recovery.
 */
export default function AppLockPrompts() {
  const navigate = useNavigate()

  const [, refresh] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    window.addEventListener(APP_LOCK_PROMPT_EVENT, refresh)

    return () => window.removeEventListener(APP_LOCK_PROMPT_EVENT, refresh)
  }, [])

  if (isPinUpgradePending()) {
    return (
      <ConfirmActionModal
        open
        title="رمز قوی‌تر"
        message="رمز قفل شما کمتر از ۶ رقم است. برای امنیت بیشتر، آن را در تنظیمات به رمزی ۶ رقمی یا بلندتر تغییر دهید."
        confirmLabel="تغییر رمز"
        cancelLabel="بعداً"
        onClose={dismissPinUpgrade}
        onConfirm={() => {
          dismissPinUpgrade()
          navigate(SETTINGS_PATH)
        }}
      />
    )
  }

  if (isLockSetupOffered() && !isAppLockEnabled()) {
    return (
      <ConfirmActionModal
        open
        title="رمز جدید برای قفل اپ"
        message="قفل اپ و نسخهٔ قبلی اطلاعات این دستگاه پاک شد و اطلاعات دوباره از گوگل شیت دریافت می‌شود. برای محافظت دوباره، در تنظیمات یک رمز جدید (حداقل ۶ رقم) تعیین کنید."
        confirmLabel="تعیین رمز جدید"
        cancelLabel="بعداً"
        onClose={dismissLockSetupOffer}
        onConfirm={() => {
          dismissLockSetupOffer()
          navigate(SETTINGS_PATH)
        }}
      />
    )
  }

  return null
}
