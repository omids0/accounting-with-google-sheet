import { appLockBiometricDetailClass, appLockBiometricNoteClass } from '../ui/appLockStyles'
import Button from '../ui/Button'

interface AppLockBiometricRowProps {
  lockEnabled: boolean
  available: boolean
  enabled: boolean
  unavailableReason: string | null
  detail: string | null
  loading: boolean
  onEnable: () => void
  onDisable: () => void
}

/**
 * Always says something about biometry — a button when it can be used, and the
 * device's own answer when it cannot — so the option never disappears silently.
 */
export default function AppLockBiometricRow({
  lockEnabled,
  available,
  enabled,
  unavailableReason,
  detail,
  loading,
  onEnable,
  onDisable
}: AppLockBiometricRowProps) {
  if (enabled) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={onDisable}>
        غیرفعال‌سازی اثر انگشت
      </Button>
    )
  }

  if (available && lockEnabled) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={onEnable} disabled={loading}>
        فعال‌سازی اثر انگشت
      </Button>
    )
  }

  if (available) {
    return (
      <p className={appLockBiometricNoteClass}>
        پس از تعیین رمز، می‌توانید اثر انگشت را روی همین دستگاه فعال کنید.
      </p>
    )
  }

  return (
    <>
      <p className={appLockBiometricNoteClass}>
        {unavailableReason ?? 'اثر انگشت روی این دستگاه در دسترس نیست.'}
      </p>
      {detail && <p className={appLockBiometricDetailClass}>وضعیت دستگاه: {detail}</p>}
    </>
  )
}
