import { useCallback, useEffect, useState } from 'react'

import {
  getRemainingUnlockAttempts,
  getUnlockLockoutRemainingMs,
  recordFailedUnlock,
  resetUnlockAttempts
} from '../../services/appLockAttempts'
import { formatPersianNumber } from '../../utils/formatMoney'

const WARN_WHEN_ATTEMPTS_LEFT = 2

function formatWait(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)

  const minutes = Math.floor(totalSeconds / 60)

  const seconds = totalSeconds % 60

  if (!minutes) return `${formatPersianNumber(seconds)} ثانیه`
  if (!seconds) return `${formatPersianNumber(minutes)} دقیقه`

  return `${formatPersianNumber(minutes)} دقیقه و ${formatPersianNumber(seconds)} ثانیه`
}

/** Persian message for a wrong PIN, warning when a lockout is close. */
export function wrongPinMessage(): string {
  const left = getRemainingUnlockAttempts()

  if (left > 0 && left <= WARN_WHEN_ATTEMPTS_LEFT) {
    return `رمز اشتباه است — ${formatPersianNumber(left)} تلاش دیگر تا قفل موقت باقی است`
  }

  return 'رمز اشتباه است'
}

/** Escalating wait after repeated wrong PINs, persisted across reloads. */
export function useUnlockLockout() {
  const [remainingMs, setRemainingMs] = useState(() => getUnlockLockoutRemainingMs())

  const locked = remainingMs > 0

  useEffect(() => {
    if (!locked) return

    const timer = setInterval(() => setRemainingMs(getUnlockLockoutRemainingMs()), 1000)

    return () => clearInterval(timer)
  }, [locked])

  const registerFailure = useCallback(() => {
    setRemainingMs(recordFailedUnlock())
  }, [])

  const registerSuccess = useCallback(() => {
    resetUnlockAttempts()
    setRemainingMs(0)
  }, [])

  const lockoutMessage = locked
    ? `تلاش‌های ناموفق زیاد بود. ${formatWait(remainingMs)} دیگر دوباره امتحان کنید.`
    : ''

  return { locked, lockoutMessage, registerFailure, registerSuccess }
}
