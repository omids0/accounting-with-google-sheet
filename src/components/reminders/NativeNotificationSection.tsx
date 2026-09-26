import { useLocalReminders } from '../../hooks/useLocalReminders'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

const mutedTextStyle = {
  fontSize: '0.85rem',
  color: 'var(--color-text-muted)',
  marginBottom: '0.75rem'
} as const

export default function NativeNotificationSection() {
  const { permission, scheduledCount, busy, enable, sendTest } = useLocalReminders()

  const granted = permission === 'granted'

  return (
    <Card>
      <CardTitle>وضعیت اعلان</CardTitle>
      <p style={mutedTextStyle}>
        در نسخهٔ اندروید، یادآوری‌ها مستقیم روی همین گوشی زمان‌بندی می‌شوند و به سرور یا نصب PWA
        نیازی ندارند. هر بار که اپ را باز کنید، یادآوری‌های یک ماه آینده دوباره از روی شیت محاسبه و
        تنظیم می‌شوند.
      </p>

      <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div>
          اجازهٔ اعلان:{' '}
          <span className={`status-badge ${granted ? 'status-connected' : 'status-disconnected'}`}>
            {granted ? 'داده شده' : permission === 'denied' ? 'رد شده' : 'تنظیم نشده'}
          </span>
        </div>
        <div>
          یادآوری‌های زمان‌بندی‌شده:{' '}
          <span
            className={`status-badge ${
              scheduledCount > 0 ? 'status-connected' : 'status-disconnected'
            }`}
          >
            {scheduledCount}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" type="button" onClick={enable} disabled={busy}>
          {granted ? 'بروزرسانی یادآوری‌ها' : 'فعال‌سازی اعلان'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={sendTest}
          disabled={busy || !granted}
        >
          اعلان آزمایشی
        </Button>
      </div>

      {permission === 'denied' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          اجازهٔ اعلان رد شده است. از تنظیمات گوشی → برنامه‌ها → حسابداری شخصی → اعلان‌ها آن را روشن
          کنید.
        </p>
      )}
    </Card>
  )
}
