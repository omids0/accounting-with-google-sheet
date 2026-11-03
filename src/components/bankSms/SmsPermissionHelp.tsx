import { useState } from 'react'

import { useSmsPermissionRecheck } from '../../hooks/useSmsPermissionRecheck'
import { openNativeAppSettings } from '../../services/bankSmsNative'
import { showError } from '../../utils/toast'
import Alert from '../ui/Alert'
import { smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'

type SmsPermissionHelpProps = {
  /** Called once the permission turns out granted after the user returns from settings. */
  onGranted?: () => void
  /** Offered after it is granted, e.g. turning capture on. */
  grantedAction?: { label: string; onClick: () => void; busy?: boolean }
}

const listClass = 'm-0 grid list-decimal gap-1.5 ps-5 text-[0.8rem] leading-relaxed'

/**
 * Shown wherever the SMS permission came back «denied». Android blocks it for an APK installed
 * outside a store («Allow restricted settings») and stops asking after two refusals, so the
 * only way out is the app's settings screen; coming back re-checks by itself.
 */
export default function SmsPermissionHelp({ onGranted, grantedAction }: SmsPermissionHelpProps) {
  const [granted, setGranted] = useState(false)

  useSmsPermissionRecheck(!granted, () => {
    setGranted(true)
    onGranted?.()
  })

  const openSettings = async () => {
    if (!(await openNativeAppSettings())) {
      showError('صفحهٔ تنظیمات باز نشد؛ از تنظیمات گوشی ← برنامه‌ها اقدام کنید')
    }
  }

  if (granted) {
    return (
      <div className="flex flex-col gap-2">
        <p className={smsHintClass} role="status">
          اجازهٔ پیامک داده شد.
        </p>
        {grantedAction && (
          <Button
            type="button"
            size="sm"
            loading={grantedAction.busy}
            onClick={grantedAction.onClick}
          >
            {grantedAction.label}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Alert variant="warning" className="mb-0 flex flex-col gap-3">
      <p className="m-0 font-bold">
        اندروید برنامه‌های نصب‌شده خارج از فروشگاه را برای پیامک محدود می‌کند.
      </p>
      <ol className={listClass}>
        <li>«تنظیمات برنامه» را باز کنید (دکمهٔ زیر).</li>
        <li>اگر در منوی ⋮ بالای صفحه گزینهٔ «مجاز کردن تنظیمات محدودشده» را دیدید، آن را بزنید.</li>
        <li>به «دسترسی‌ها» ← «پیامک» بروید و «مجاز» را انتخاب کنید.</li>
        <li>به همین صفحه برگردید؛ وضعیت خودش به‌روز می‌شود.</li>
      </ol>
      <Button type="button" variant="secondary" onClick={openSettings}>
        باز کردن تنظیمات برنامه
      </Button>
    </Alert>
  )
}
