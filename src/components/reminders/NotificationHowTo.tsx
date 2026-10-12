import { openNativeNotificationSettings } from '../../services/bankSmsNative'
import { showError } from '../../utils/toast'
import Button from '../ui/Button'

interface NotificationHowToProps {
  native: boolean
}

const listClass = 'm-0 grid list-decimal gap-1.5 ps-5 text-[0.82rem] leading-relaxed text-muted'

/** Per-platform steps to allow notifications after the user has refused them. */
export default function NotificationHowTo({ native }: NotificationHowToProps) {
  if (native) {
    const openSettings = async () => {
      if (!(await openNativeNotificationSettings())) {
        showError('صفحهٔ تنظیمات باز نشد؛ از تنظیمات گوشی اقدام کنید')
      }
    }

    return (
      <div className="mt-3 grid gap-3">
        <ol className={listClass}>
          <li>تنظیمات گوشی ← برنامه‌ها ← «حسابداری شخصی» را باز کنید.</li>
          <li>بخش «اعلان‌ها» را روشن کنید.</li>
          <li>به همین صفحه برگردید؛ وضعیت خودش به‌روز می‌شود.</li>
        </ol>
        <Button type="button" variant="secondary" size="sm" onClick={openSettings}>
          باز کردن تنظیمات اعلان
        </Button>
      </div>
    )
  }

  return (
    <ol className={`mt-3 ${listClass}`}>
      <li>روی علامت قفل یا تنظیمات کنار نشانی سایت در بالای مرورگر بزنید.</li>
      <li>در «تنظیمات سایت» گزینهٔ «اعلان‌ها» را روی «اجازه» بگذارید.</li>
      <li>
        اگر اپ را روی گوشی نصب کرده‌اید: تنظیمات گوشی ← برنامه‌ها ← همین اپ (یا مرورگر) ← اعلان‌ها.
      </li>
      <li>به همین صفحه برگردید و یک بار «اجازه بده» را بزنید.</li>
    </ol>
  )
}
