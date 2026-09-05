import type { AppLockPolicy } from '../types'
import { isAppLockEnabled } from './appLock'
import { getDeviceConfig, saveDeviceConfig } from './appLockStorage'

export const APP_LOCK_REQUEST_EVENT = 'accounting-app-lock-request'

export const DEFAULT_APP_LOCK_POLICY: AppLockPolicy = 'background'

export const DEFAULT_IDLE_MINUTES = 5

export const IDLE_MINUTE_OPTIONS = [5, 15, 30] as const

export const APP_LOCK_POLICY_OPTIONS: Array<{
  value: AppLockPolicy
  label: string
  description: string
}> = [
  {
    value: 'background',
    label: 'فقط بعد از خروج از اپ',
    description: 'رفرش صفحه رمز نمی‌خواهد؛ با تعویض تب یا بستن اپ دوباره قفل می‌شود.'
  },
  {
    value: 'session',
    label: 'یک‌بار در هر نشست',
    description: 'تا وقتی تب باز است رفرش و جابه‌جایی داخل مرورگر رمز نمی‌خواهد.'
  },
  {
    value: 'always',
    label: 'همیشه',
    description: 'با هر بار باز کردن یا رفرش اپ رمز می‌خواهد (امن‌ترین).'
  },
  {
    value: 'idle',
    label: 'بعد از بی‌فعالیت',
    description: 'اگر مدتی کاری نکنید یا اپ در پس‌زمینه بماند، قفل می‌شود.'
  },
  {
    value: 'manual',
    label: 'فقط دستی',
    description: 'خودکار قفل نمی‌شود؛ با دکمه «قفل الان» می‌توانید قفل کنید.'
  }
]

const UNLOCKED_KEY = 'accounting_app_lock_unlocked'
const PENDING_KEY = 'accounting_app_lock_pending'
const HIDDEN_AT_KEY = 'accounting_app_lock_hidden_at'
const LAST_ACTIVITY_KEY = 'accounting_app_lock_last_activity'

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Ignore storage failures in private mode.
  }
}

function removeSession(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Ignore storage failures in private mode.
  }
}

export function getLockPolicy(): AppLockPolicy {
  return getDeviceConfig()?.lockPolicy ?? DEFAULT_APP_LOCK_POLICY
}

export function getIdleMinutes(): number {
  const minutes = getDeviceConfig()?.idleMinutes ?? DEFAULT_IDLE_MINUTES

  return IDLE_MINUTE_OPTIONS.includes(minutes as (typeof IDLE_MINUTE_OPTIONS)[number])
    ? minutes
    : DEFAULT_IDLE_MINUTES
}

export function setLockPolicy(policy: AppLockPolicy, idleMinutes?: number): void {
  const device = getDeviceConfig() ?? {}

  saveDeviceConfig({
    ...device,
    lockPolicy: policy,
    idleMinutes: idleMinutes ?? device.idleMinutes ?? DEFAULT_IDLE_MINUTES
  })
}

export function getPolicyDescription(policy: AppLockPolicy): string {
  return APP_LOCK_POLICY_OPTIONS.find(option => option.value === policy)?.description ?? ''
}

export function markSessionUnlocked(): void {
  writeSession(UNLOCKED_KEY, '1')
  clearBackgroundPending()
  touchActivity()
}

export function clearSessionUnlocked(): void {
  removeSession(UNLOCKED_KEY)
}

export function isSessionUnlocked(): boolean {
  return readSession(UNLOCKED_KEY) === '1'
}

export function shouldLockOnMount(): boolean {
  if (!isAppLockEnabled()) return false

  const policy = getLockPolicy()

  if (policy === 'manual') return false
  if (policy === 'always') return true

  return !isSessionUnlocked()
}

export function shouldMarkBackgroundPending(): boolean {
  const policy = getLockPolicy()

  return policy === 'always' || policy === 'background' || policy === 'idle'
}

function isIdleExpired(referenceTime = Date.now()): boolean {
  const lastActivity = Number(readSession(LAST_ACTIVITY_KEY) || 0)

  if (!lastActivity) return false

  return referenceTime - lastActivity > getIdleMinutes() * 60_000
}

function isIdleExpiredSinceHidden(): boolean {
  const hiddenAt = Number(readSession(HIDDEN_AT_KEY) || 0)

  if (!hiddenAt) return isIdleExpired()

  return Date.now() - hiddenAt > getIdleMinutes() * 60_000
}

export function shouldLockOnForeground(): boolean {
  if (!isAppLockEnabled()) return false

  const policy = getLockPolicy()

  if (policy === 'manual' || policy === 'session') return false

  const pending = readSession(PENDING_KEY) === '1'

  if (policy === 'idle') {
    if (pending) return isIdleExpiredSinceHidden()

    return isIdleExpired()
  }

  return pending
}

export function markBackgroundPending(): void {
  if (!isAppLockEnabled() || !shouldMarkBackgroundPending()) return

  writeSession(PENDING_KEY, '1')
  writeSession(HIDDEN_AT_KEY, String(Date.now()))
}

export function clearBackgroundPending(): void {
  removeSession(PENDING_KEY)
  removeSession(HIDDEN_AT_KEY)
}

export function touchActivity(): void {
  writeSession(LAST_ACTIVITY_KEY, String(Date.now()))
}

export function requestAppLock(): void {
  window.dispatchEvent(new Event(APP_LOCK_REQUEST_EVENT))
}
