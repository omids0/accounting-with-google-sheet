import type { getPushSupportStatus } from '../../services/pushNotifications'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

interface PushStatusSectionProps {
  pushStatus: ReturnType<typeof getPushSupportStatus>
  permission: NotificationPermission | 'unsupported'
  swStatus: 'ready' | 'pending' | 'missing'
  isInstalled: boolean
  hasSubscription: boolean
  saving: boolean
  canInstall: boolean
  isIos: boolean
  showIosHint: boolean
  install: () => void
  dismissIosHint: () => void
  onEnablePush: () => void
  onDisablePush: () => void
  onTestNotification: () => void
}

export default function PushStatusSection({
  pushStatus,
  permission,
  swStatus,
  isInstalled,
  hasSubscription,
  saving,
  canInstall,
  isIos,
  showIosHint,
  install,
  dismissIosHint,
  onEnablePush,
  onDisablePush,
  onTestNotification
}: PushStatusSectionProps) {
  return (
    <Card>
      <CardTitle>وضعیت نوتیف</CardTitle>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          marginBottom: '0.75rem'
        }}
      >
        یادآوری روزانه (وقتی دیروز اپ را باز نکردید) به‌صورت پیش‌فرض فعال است و با cron ارسال
        می‌شود. برای اقساط و cron، PWA را نصب کنید، اجازهٔ نوتیف بدهید و یک‌بار راه‌اندازی را انجام
        دهید.
      </p>

      <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div>
          پشتیبانی:{' '}
          <span
            className={`status-badge ${
              pushStatus === 'supported' ? 'status-connected' : 'status-disconnected'
            }`}
          >
            {pushStatus === 'supported' && 'آماده'}
            {pushStatus === 'missing-api' && 'مرورگر پشتیبانی نمی‌کند'}
            {pushStatus === 'missing-vapid' && 'کلید VAPID تنظیم نشده'}
            {pushStatus === 'ios-needs-install' && 'iOS: ابتدا Add to Home Screen'}
          </span>
        </div>
        <div>
          اجازه:{' '}
          <span
            className={`status-badge ${
              permission === 'granted' ? 'status-connected' : 'status-disconnected'
            }`}
          >
            {permission === 'granted' && 'داده شده'}
            {permission === 'denied' && 'رد شده'}
            {permission === 'default' && 'هنوز پرسیده نشده'}
            {permission === 'unsupported' && 'ناموجود'}
          </span>
        </div>
        <div>
          Service Worker:{' '}
          <span
            className={`status-badge ${
              swStatus === 'ready' ? 'status-connected' : 'status-disconnected'
            }`}
          >
            {swStatus === 'ready' && 'آماده'}
            {swStatus === 'pending' && 'در حال آماده‌سازی — refresh کنید'}
            {swStatus === 'missing' && 'ثبت نشده — dev را restart یا deploy کنید'}
          </span>
        </div>
        <div>
          نصب PWA:{' '}
          <span
            className={`status-badge ${isInstalled ? 'status-connected' : 'status-disconnected'}`}
          >
            {isInstalled ? 'نصب شده' : 'نصب نشده (روی دسکتاپ اختیاری)'}
          </span>
        </div>
        <div>
          دستگاه:{' '}
          <span
            className={`status-badge ${
              hasSubscription ? 'status-connected' : 'status-disconnected'
            }`}
          >
            {hasSubscription ? 'ثبت‌شده برای نوتیف' : 'ثبت نشده'}
          </span>
        </div>
      </div>

      {!isInstalled && (canInstall || isIos || pushStatus === 'ios-needs-install') && (
        <Alert variant="info" style={{ marginTop: '0.75rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            {isIos
              ? 'در iOS برای نوتیf حتماً اپ را به Home Screen اضافه کنید.'
              : 'برای تجربهٔ بهتر (مخصوصاً روی گوشی) اپ را نصب کنید.'}
          </p>
          {(canInstall || isIos) && (
            <Button variant="primary" size="sm" type="button" onClick={install}>
              نصب اپ روی دستگاه
            </Button>
          )}
          {showIosHint && (
            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Safari → Share (□↑) → Add to Home Screen
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={dismissIosHint}
                style={{ marginInlineStart: '0.5rem' }}
              >
                متوجه شدم
              </Button>
            </p>
          )}
        </Alert>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        {!hasSubscription ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onEnablePush}
            disabled={saving || pushStatus !== 'supported'}
          >
            {saving && <span className="spinner" />}
            فعال‌سازی نوتیف
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDisablePush}
            disabled={saving}
          >
            غیرفعال در این دستگاه
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onTestNotification}
          disabled={saving || permission !== 'granted'}
        >
          تست نوتیف
        </Button>
      </div>
    </Card>
  )
}
