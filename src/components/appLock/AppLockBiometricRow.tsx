import { appLockBiometricDetailClass, appLockBiometricNoteClass } from '../ui/appLockStyles'
import Button from '../ui/Button'

interface AppLockBiometricRowProps {
  lockEnabled: boolean
  available: boolean
  enabled: boolean
  unavailableReason: string | null
  detail: string | null
  error: string | null
  loading: boolean
  onEnable: () => void
  onDisable: () => void
}

function BiometricBody({
  lockEnabled,
  available,
  enabled,
  unavailableReason,
  loading,
  onEnable,
  onDisable
}: Omit<AppLockBiometricRowProps, 'detail' | 'error'>) {
  if (enabled) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={onDisable}>
        غیرفعال‌سازی اثر انگشت
      </Button>
    )
  }

  if (available && lockEnabled) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onEnable}
        disabled={loading}
        loading={loading}
      >
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
    <p className={appLockBiometricNoteClass}>
      {unavailableReason ?? 'اثر انگشت روی این دستگاه در دسترس نیست.'}
    </p>
  )
}

/**
 * Always says something about biometry — a button when it can be used, the device's
 * own answer when it cannot, and the last failure when the prompt refused to open.
 */
export default function AppLockBiometricRow({ detail, error, ...body }: AppLockBiometricRowProps) {
  return (
    <>
      <BiometricBody {...body} />
      {error && <p className={appLockBiometricNoteClass}>{error}</p>}
      {detail && <p className={appLockBiometricDetailClass}>وضعیت دستگاه: {detail}</p>}
    </>
  )
}
