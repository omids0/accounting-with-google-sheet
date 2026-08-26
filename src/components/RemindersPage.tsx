import { useEffect, useMemo, useState } from 'react';
import { AccordionCollapse } from './AccordionCollapse';
import { FormSelect } from './form';
import AppIcon from './AppIcon';
import { getSettings } from '../services/settings';
import {
  fetchReminderRules,
  formatInstallmentReminderMessage,
  getReminderKindLabel,
  previewInstallmentReminders,
  removePushSubscription,
  saveReminderRules,
  upsertPushSubscription,
  type UpcomingInstallmentReminder,
} from '../services/reminders';
import {
  getCurrentPushSubscription,
  getDeviceLabel,
  getNotificationPermission,
  getPushSupportStatus,
  getServiceWorkerStatus,
  showLocalTestNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '../services/pushNotifications';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { isTokenValid } from '../services/auth';
import { showError, showSuccess } from '../utils/toast';
import type { ReminderRule } from '../types';
import { formatIsoDatePersian } from '../utils/jalaliDate';

const DAYS_BEFORE_OPTIONS = [
  { value: '0', label: 'همان روز موعد' },
  { value: '1', label: '۱ روز قبل' },
  { value: '2', label: '۲ روز قبل' },
  { value: '3', label: '۳ روز قبل' },
  { value: '7', label: '۷ روز قبل' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));

const MINUTE_OPTIONS = [
  { value: '0', label: '00' },
  { value: '15', label: '15' },
  { value: '30', label: '30' },
  { value: '45', label: '45' },
];

interface RemindersPageProps {
  onBack: () => void;
}

export default function RemindersPage({ onBack }: RemindersPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [installmentsRule, setInstallmentsRule] = useState<ReminderRule>({
    kind: 'installments',
    enabled: false,
    daysBefore: 1,
    hour: 9,
    minute: 0,
  });
  const [preview, setPreview] = useState<UpcomingInstallmentReminder[]>([]);
  const [permission, setPermission] = useState(getNotificationPermission());
  const [hasSubscription, setHasSubscription] = useState(false);
  const [swStatus, setSwStatus] = useState<'ready' | 'pending' | 'missing'>('pending');
  const pushStatus = getPushSupportStatus();
  const { canInstall, isInstalled, showIosHint, isIos, install, dismissIosHint } = usePwaInstall();

  const spreadsheetId = getSettings()?.spreadsheetId ?? '';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!spreadsheetId || !isTokenValid()) {
        setLoading(false);
        return;
      }

      try {
        const rules = await fetchReminderRules(spreadsheetId);
        const installments = rules.find((rule) => rule.kind === 'installments');
        if (installments && !cancelled) {
          setInstallmentsRule(installments);
          const upcoming = await previewInstallmentReminders(spreadsheetId, installments);
          if (!cancelled) setPreview(upcoming);
        }
      } catch (err) {
        if (!cancelled) {
          showError(err instanceof Error ? err.message : 'خطا در بارگذاری یادآوری‌ها');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const sub = await getCurrentPushSubscription();
        if (!cancelled) setHasSubscription(!!sub?.endpoint);
        const status = await getServiceWorkerStatus();
        if (!cancelled) setSwStatus(status);
      } catch {
        if (!cancelled) {
          setHasSubscription(false);
          setSwStatus('missing');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [spreadsheetId]);

  const previewLines = useMemo(
    () =>
      preview.map((item) => {
        const message = formatInstallmentReminderMessage(item);
        return `${message.body} (${formatIsoDatePersian(item.remindOn)})`;
      }),
    [preview]
  );

  const handleEnablePush = async () => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید');
      return;
    }

    setSaving(true);
    try {
      const subscription = await subscribeToPush();
      await upsertPushSubscription(spreadsheetId, {
        endpoint: subscription.endpoint!,
        p256dh: subscription.keys!.p256dh!,
        auth: subscription.keys!.auth!,
        deviceLabel: getDeviceLabel(),
        updatedAt: new Date().toISOString(),
      });
      setPermission(getNotificationPermission());
      setHasSubscription(true);
      showSuccess('نوتیف فعال شد و این دستگاه ثبت گردید');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'فعال‌سازی نوتیف ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const handleDisablePush = async () => {
    setSaving(true);
    try {
      const current = await getCurrentPushSubscription();
      if (current?.endpoint && spreadsheetId) {
        await removePushSubscription(spreadsheetId, current.endpoint);
      }
      await unsubscribeFromPush();
      setHasSubscription(false);
      setPermission(getNotificationPermission());
      showSuccess('نوتیف این دستگاه غیرفعال شد');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'غیرفعال‌سازی ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = async () => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید');
      return;
    }
    if (installmentsRule.enabled && !hasSubscription) {
      showError('برای فعال‌کردن یادآوری، ابتدا نوتیف را روشن کنید');
      return;
    }

    setSaving(true);
    try {
      await saveReminderRules(spreadsheetId, [installmentsRule]);
      const upcoming = await previewInstallmentReminders(spreadsheetId, installmentsRule);
      setPreview(upcoming);
      showSuccess('تنظیمات یادآوری ذخیره شد');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setSaving(true);
    try {
      await showLocalTestNotification();
      showSuccess('نوتیف تست ارسال شد');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ارسال تست ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const refreshPreview = async (nextRule: ReminderRule) => {
    if (!spreadsheetId) return;
    try {
      const upcoming = await previewInstallmentReminders(spreadsheetId, nextRule);
      setPreview(upcoming);
    } catch {
      /* ignore preview errors while editing */
    }
  };

  const updateInstallmentsRule = (patch: Partial<ReminderRule>) => {
    setInstallmentsRule((current) => {
      const next = { ...current, ...patch };
      void refreshPreview(next);
      return next;
    });
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onBack}
        style={{ marginBottom: '0.75rem' }}
      >
        <AppIcon name="back" size={16} strokeWidth={2} />
        <span style={{ marginInlineStart: '0.35rem' }}>بازگشت به تنظیمات</span>
      </button>

      {loading ? (
        <div className="card">
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>در حال بارگذاری...</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="card-title">وضعیت نوتیف</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              یادآوری روزانه (وقتی دیروز اپ را باز نکردید) به‌صورت پیش‌فرض فعال است و با cron
              ارسال می‌شود. برای اقساط و cron، PWA را نصب کنید، اجازهٔ نوتیف بدهید و یک‌بار
              راه‌اندازی را انجام دهید.
            </p>

            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div>
                پشتیبانی:{' '}
                <span className={`status-badge ${pushStatus === 'supported' ? 'status-connected' : 'status-disconnected'}`}>
                  {pushStatus === 'supported' && 'آماده'}
                  {pushStatus === 'missing-api' && 'مرورگر پشتیبانی نمی‌کند'}
                  {pushStatus === 'missing-vapid' && 'کلید VAPID تنظیم نشده'}
                  {pushStatus === 'ios-needs-install' && 'iOS: ابتدا Add to Home Screen'}
                </span>
              </div>
              <div>
                اجازه:{' '}
                <span className={`status-badge ${permission === 'granted' ? 'status-connected' : 'status-disconnected'}`}>
                  {permission === 'granted' && 'داده شده'}
                  {permission === 'denied' && 'رد شده'}
                  {permission === 'default' && 'هنوز پرسیده نشده'}
                  {permission === 'unsupported' && 'ناموجود'}
                </span>
              </div>
              <div>
                Service Worker:{' '}
                <span className={`status-badge ${swStatus === 'ready' ? 'status-connected' : 'status-disconnected'}`}>
                  {swStatus === 'ready' && 'آماده'}
                  {swStatus === 'pending' && 'در حال آماده‌سازی — refresh کنید'}
                  {swStatus === 'missing' && 'ثبت نشده — dev را restart یا deploy کنید'}
                </span>
              </div>
              <div>
                نصب PWA:{' '}
                <span className={`status-badge ${isInstalled ? 'status-connected' : 'status-disconnected'}`}>
                  {isInstalled ? 'نصب شده' : 'نصب نشده (روی دسکتاپ اختیاری)'}
                </span>
              </div>
              <div>
                دستگاه:{' '}
                <span className={`status-badge ${hasSubscription ? 'status-connected' : 'status-disconnected'}`}>
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
                  onClick={handleEnablePush}
                  disabled={saving || pushStatus !== 'supported'}
                >
                  {saving && <span className="spinner" />}
                  فعال‌سازی نوتیف
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDisablePush}
                  disabled={saving}
                >
                  غیرفعال در این دستگاه
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleTestNotification}
                disabled={saving || permission !== 'granted'}
              >
                تست نوتیف
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">{getReminderKindLabel('installments')}</h2>
            <label className="checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={installmentsRule.enabled}
                onChange={(e) => updateInstallmentsRule({ enabled: e.target.checked })}
              />
              <span>یادآوری اقساط پرداخت‌نشده</span>
            </label>

            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              <FormSelect
                label="چند روز قبل از موعد؟"
                value={String(installmentsRule.daysBefore)}
                onChange={(value) => updateInstallmentsRule({ daysBefore: Number(value) })}
                options={DAYS_BEFORE_OPTIONS}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <FormSelect
                  label="ساعت ارسال"
                  value={String(installmentsRule.hour)}
                  onChange={(value) => updateInstallmentsRule({ hour: Number(value) })}
                  options={HOUR_OPTIONS}
                />
                <FormSelect
                  label="دقیقه"
                  value={String(installmentsRule.minute)}
                  onChange={(value) => updateInstallmentsRule({ minute: Number(value) })}
                  options={MINUTE_OPTIONS}
                />
              </div>
            </div>

            {installmentsRule.enabled && (
              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                {previewLines.length ? (
                  <>
                    <p style={{ marginBottom: '0.5rem' }}>با تنظیم فعلی، این موارد یادآوری می‌شوند:</p>
                    <ul style={{ margin: 0, paddingInlineStart: '1.1rem' }}>
                      {previewLines.map((line) => (
                        <li key={line} style={{ marginBottom: '0.25rem' }}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p style={{ margin: 0 }}>فعلاً قسط پرداخت‌نشده‌ای برای این بازه پیدا نشد.</p>
                )}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.75rem' }}
              onClick={handleSaveRule}
              disabled={saving}
            >
              {saving && <span className="spinner" />}
              ذخیره تنظیمات
            </button>
          </div>

          <div className="card">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSetup((value) => !value)}
              style={{ width: '100%' }}
            >
              {showSetup ? 'بستن راهنمای cron رایگان' : 'راه‌اندازی cron رایگان (Google Apps Script)'}
            </button>
            <AccordionCollapse open={showSetup}>
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>cron سبک</strong> یعنی یک job زمان‌بندی‌شده که مثلاً هر ۱۵ دقیقه اجرا می‌شود،
                  اقساط را از همین Google Sheet می‌خواند و نوتیf می‌فرستد — بدون سرور پولی.
                </p>
                <ol style={{ margin: 0, paddingInlineStart: '1.2rem', display: 'grid', gap: '0.5rem' }}>
                  <li>
                    کلید VAPID بسازید:{' '}
                    <code dir="ltr">npx @pushforge/builder vapid</code>
                  </li>
                  <li>
                    Public Key را در <code dir="ltr">VITE_VAPID_PUBLIC_KEY</code> قرار دهید و اپ را
                    rebuild کنید.
                  </li>
                  <li>
                    Cloudflare Worker رایگان را از پوشه{' '}
                    <code dir="ltr">workers/reminder-push</code> deploy کنید (راهنما در همان پوشه).
                  </li>
                  <li>
                    در Google Sheet → Extensions → Apps Script فایل{' '}
                    <code dir="ltr">scripts/google-apps-script/RemindersCron.gs</code> را paste کنید.
                  </li>
                  <li>
                    Script Properties: <code dir="ltr">PUSH_WORKER_URL</code> و{' '}
                    <code dir="ltr">PUSH_WORKER_SECRET</code>
                  </li>
                  <li>Trigger بسازید: تابع <code dir="ltr">runReminderCron</code> — Every 15 minutes</li>
                </ol>
                <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                  همهٔ سرویس‌ها رایگان‌اند: Google Sheets + Apps Script + Cloudflare Free.
                </p>
              </div>
            </AccordionCollapse>
          </div>
        </>
      )}
    </div>
  );
}
