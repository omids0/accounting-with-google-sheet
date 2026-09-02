import type { getPushSupportStatus } from '../../services/pushNotifications'

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
    <div className="card">
      <h2 className="card-title">وضعیت نوتیف</h2>
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
        <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            {isIos
              ? 'در iOS برای نوتیf حتماً اپ را به Home Screen اضافه کنید.'
              : 'برای تجربهٔ بهتر (مخصوصاً روی گوشی) اپ را نصب کنید.'}
          </p>
          {(canInstall || isIos) && (
            <button className="btn btn-primary btn-sm" type="button" onClick={install}>
              نصب اپ روی دستگاه
            </button>
          )}
          {showIosHint && (
            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Safari → Share (□↑) → Add to Home Screen
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={dismissIosHint}
                style={{ marginInlineStart: '0.5rem' }}
              >
                متوجه شدم
              </button>
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        {!hasSubscription ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onEnablePush}
            disabled={saving || pushStatus !== 'supported'}
          >
            {saving && <span className="spinner" />}
            فعال‌سازی نوتیف
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onDisablePush}
            disabled={saving}
          >
            غیرفعال در این دستگاه
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onTestNotification}
          disabled={saving || permission !== 'granted'}
        >
          تست نوتیف
        </button>
      </div>
    </div>
  )
}
