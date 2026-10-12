import { isAppLockEnabled } from './appLock'
import { DEFAULT_APP_LOCK_POLICY, DEFAULT_IDLE_MINUTES } from './appLockPolicy'
import { getDeviceConfig, updateDeviceConfig } from './appLockStorage'

export const LOCK_POLICY_MIGRATION_NOTICE =
  'قفل اپ حالا بعد از ۵ دقیقه بی‌فعالیت فعال می‌شود؛ در تنظیمات قابل تغییر است'

/**
 * `background` used to be the default and was never written at setup, so a lock
 * on `background` without `policyChosen` is the old implicit default: move it to
 * the new idle default once and queue a toast. A policy the user picked stays.
 */
export function migrateImplicitLockPolicy(): void {
  if (!isAppLockEnabled()) return

  const device = getDeviceConfig() ?? {}

  if (device.policyChosen) return
  if (device.lockPolicy && device.lockPolicy !== 'background') return

  updateDeviceConfig({
    lockPolicy: DEFAULT_APP_LOCK_POLICY,
    idleMinutes: DEFAULT_IDLE_MINUTES,
    policyNoticePending: true
  })
}

/** True once per migrated device; the caller shows the toast. */
export function consumeLockPolicyNotice(): boolean {
  if (!getDeviceConfig()?.policyNoticePending) return false

  updateDeviceConfig({ policyNoticePending: false })

  return true
}
