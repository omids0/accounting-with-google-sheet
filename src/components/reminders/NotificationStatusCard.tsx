import { useState } from 'react'

import NotificationHowTo from './NotificationHowTo'
import type { ReminderPermission } from './useReminderPermission'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { showTestNotification } from '../../services/localNotifications'
import { getPushSupportStatus, showLocalTestNotification } from '../../services/pushNotifications'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import { AccordionCollapse } from '../AccordionCollapse'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  reminderStatusDotClass,
  reminderStatusHintClass,
  reminderStatusLineClass,
  reminderTextButtonClass
} from '../ui/reminderStyles'

interface NotificationStatusCardProps {
  permission: ReminderPermission
  onGrant: () => void
}

function UnsupportedHint() {
  const { canInstall, isIos, install } = usePwaInstall()

  if (getPushSupportStatus() === 'ios-needs-install' || isIos) {
    return (
      <p className={reminderStatusHintClass}>
        در آیفون اعلان فقط وقتی می‌رسد که اپ را به صفحهٔ اصلی اضافه کنید: Safari ← دکمهٔ
        اشتراک‌گذاری ← Add to Home Screen.
      </p>
    )
  }

  return (
    <>
      <p className={reminderStatusHintClass}>
        این مرورگر اعلان نمی‌گیرد. یادآوری‌ها به دستگاه‌های دیگری که اعلانشان روشن است می‌رسد.
      </p>
      {canInstall && (
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={install}>
          نصب اپ روی این دستگاه
        </Button>
      )}
    </>
  )
}

/** «وضعیت اعلان»: one line that follows the permission without a reload. */
export default function NotificationStatusCard({
  permission,
  onGrant
}: NotificationStatusCardProps) {
  const [howTo, setHowTo] = useState(false)
  const { native, status, requesting } = permission

  const sendTest = async () => {
    try {
      await (native ? showTestNotification() : showLocalTestNotification())
    } catch (err) {
      showError(toUserMessage(err, 'فرستادن اعلان آزمایشی ناموفق بود'))
    }
  }

  return (
    <Card aria-live="polite">
      <div className={reminderStatusLineClass}>
        <span className={reminderStatusDotClass(status)} aria-hidden />
        {status === 'checking' && <span>در حال بررسی اعلان‌ها…</span>}
        {status === 'granted' && (
          <>
            <span>اعلان‌ها روشن است · ساعت‌ها به وقت {native ? 'گوشی' : 'ایران'}</span>
            <button type="button" className={reminderTextButtonClass} onClick={sendTest}>
              اعلان آزمایشی
            </button>
          </>
        )}
        {status === 'prompt' && <span>اعلان‌ها هنوز اجازه ندارند</span>}
        {status === 'unsupported' && <span>اعلان روی این مرورگر در دسترس نیست</span>}
        {status === 'denied' && (
          <>
            <span>اجازه داده نشده —</span>
            <button
              type="button"
              className={reminderTextButtonClass}
              aria-expanded={howTo}
              onClick={() => setHowTo(open => !open)}
            >
              چطور فعال کنم؟
            </button>
          </>
        )}
      </div>

      {status === 'prompt' && (
        <>
          <p className={reminderStatusHintClass}>
            برای اینکه یادآوری‌های روشن به دستتان برسد، اپ باید اجازهٔ نمایش اعلان داشته باشد.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-2"
            onClick={onGrant}
            disabled={requesting}
            loading={requesting}
          >
            اجازه بده
          </Button>
        </>
      )}
      {status === 'unsupported' && <UnsupportedHint />}
      <AccordionCollapse open={status === 'denied' && howTo}>
        <NotificationHowTo native={native} />
      </AccordionCollapse>
    </Card>
  )
}
