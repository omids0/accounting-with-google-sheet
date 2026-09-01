import { FormEvent, useEffect, useState } from 'react';
import {
  changePin,
  disableAppLock,
  disableBiometric,
  enableBiometric,
  getAppLockConfig,
  isAppLockEnabled,
  isBiometricAvailable,
  isBiometricEnabled,
  setupAppLock,
  syncAppLockFromSheet,
  validatePinFormat,
} from '../services/appLock';
import { showError, showSuccess } from '../utils/toast';
import AppIcon from './AppIcon';

type SetupStep = 'idle' | 'setup' | 'disable' | 'change-pin' | 'disable-biometric';

export default function AppLockSettings() {
  const [enabled, setEnabled] = useState(isAppLockEnabled);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled);
  const [step, setStep] = useState<SetupStep>('idle');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [useBiometric, setUseBiometric] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void isBiometricAvailable().then(setBiometricAvailable);
    void syncAppLockFromSheet().then(() => {
      setEnabled(isAppLockEnabled());
      setBiometricOn(isBiometricEnabled());
    });
  }, []);

  const resetForm = () => {
    setStep('idle');
    setPin('');
    setConfirmPin('');
    setCurrentPin('');
    setUseBiometric(false);
  };

  const handleEnable = async (event: FormEvent) => {
    event.preventDefault();

    const formatError = validatePinFormat(pin);
    if (formatError) {
      showError(formatError);
      return;
    }
    if (pin !== confirmPin) {
      showError('تکرار رمز با رمز اصلی یکسان نیست');
      return;
    }

    setLoading(true);
    try {
      await setupAppLock(pin, useBiometric && biometricAvailable);
      setEnabled(true);
      setBiometricOn(useBiometric && biometricAvailable);
      showSuccess('قفل اپ فعال شد');
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در فعال‌سازی قفل');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await disableAppLock(currentPin);
      setEnabled(false);
      setBiometricOn(false);
      showSuccess('قفل اپ غیرفعال شد');
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در غیرفعال‌سازی');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (event: FormEvent) => {
    event.preventDefault();

    const formatError = validatePinFormat(pin);
    if (formatError) {
      showError(formatError);
      return;
    }
    if (pin !== confirmPin) {
      showError('تکرار رمز با رمز جدید یکسان نیست');
      return;
    }

    setLoading(true);
    try {
      await changePin(currentPin, pin);
      showSuccess('رمز جدید ذخیره شد');
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در تغییر رمز');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    setLoading(true);
    try {
      await enableBiometric();
      setBiometricOn(true);
      showSuccess('اثر انگشت فعال شد');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در فعال‌سازی اثر انگشت');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableBiometric = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await disableBiometric(currentPin);
      setBiometricOn(false);
      showSuccess('اثر انگشت غیرفعال شد');
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در غیرفعال‌سازی اثر انگشت');
    } finally {
      setLoading(false);
    }
  };

  const renderPinFields = (
    pinValue: string,
    onPinChange: (value: string) => void,
    confirmValue: string,
    onConfirmChange: (value: string) => void,
    submitLabel: string,
    onSubmit: (event: FormEvent) => void
  ) => (
    <form onSubmit={onSubmit} className="app-lock-form">
      <div className="form-group">
        <label>رمز {step === 'change-pin' ? 'جدید' : ''}</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={pinValue}
          onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="حداقل ۴ رقم"
          disabled={loading}
          dir="ltr"
        />
      </div>
      <div className="form-group">
        <label>تکرار رمز</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={confirmValue}
          onChange={(e) => onConfirmChange(e.target.value.replace(/\D/g, ''))}
          placeholder="تکرار رمز"
          disabled={loading}
          dir="ltr"
        />
      </div>
      {step === 'setup' && biometricAvailable && (
        <label className="app-lock-checkbox">
          <input
            type="checkbox"
            checked={useBiometric}
            onChange={(e) => setUseBiometric(e.target.checked)}
            disabled={loading}
          />
          <span>ورود با اثر انگشت (در صورت پشتیبانی دستگاه)</span>
        </label>
      )}
      <div className="app-lock-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading && <span className="spinner" />}
          {submitLabel}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={resetForm}
          disabled={loading}
        >
          انصراف
        </button>
      </div>
    </form>
  );

  const renderCurrentPinField = (
    submitLabel: string,
    onSubmit: (event: FormEvent) => void
  ) => (
    <form onSubmit={onSubmit} className="app-lock-form">
      <div className="form-group">
        <label>رمز فعلی</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
          placeholder="رمز فعلی"
          disabled={loading}
          dir="ltr"
        />
      </div>
      <div className="app-lock-form-actions">
        <button type="submit" className="btn btn-danger btn-sm" disabled={loading}>
          {loading && <span className="spinner" />}
          {submitLabel}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={resetForm}
          disabled={loading}
        >
          انصراف
        </button>
      </div>
    </form>
  );

  return (
    <div className="card">
      <h2 className="card-title">قفل اپ</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        رمز قفل در Google Sheet ذخیره می‌شود و روی همه دستگاه‌ها اعمال می‌شود. اثر انگشت
        فقط روی همین دستگاه فعال می‌شود. با خروج از اپ یا تعویض برنامه، قفل دوباره فعال
        می‌شود.
      </p>

      <div className="app-lock-status">
        <span className={`status-badge ${enabled ? 'status-connected' : 'status-disconnected'}`}>
          {enabled ? (
            <>
              <AppIcon name="lock" size={12} strokeWidth={2.5} />
              فعال
            </>
          ) : (
            <>
              <AppIcon name="x-mark" size={12} strokeWidth={2.5} />
              غیرفعال
            </>
          )}
        </span>
        {enabled && biometricOn && (
          <span className="status-badge status-connected">
            <AppIcon name="fingerprint" size={12} strokeWidth={2.5} />
            اثر انگشت
          </span>
        )}
      </div>

      {step === 'idle' && !enabled && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setStep('setup')}
        >
          فعال‌سازی قفل اپ
        </button>
      )}

      {step === 'setup' &&
        renderPinFields(pin, setPin, confirmPin, setConfirmPin, 'فعال‌سازی', handleEnable)}

      {step === 'idle' && enabled && (
        <div className="app-lock-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setStep('change-pin')}
          >
            تغییر رمز
          </button>
          {biometricAvailable && !biometricOn && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleEnableBiometric()}
              disabled={loading}
            >
              فعال‌سازی اثر انگشت
            </button>
          )}
          {biometricOn && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStep('disable-biometric')}
            >
              غیرفعال‌سازی اثر انگشت
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setStep('disable')}
          >
            غیرفعال کردن قفل
          </button>
        </div>
      )}

      {step === 'disable' && renderCurrentPinField('غیرفعال کردن قفل', handleDisable)}

      {step === 'disable-biometric' &&
        renderCurrentPinField('غیرفعال کردن اثر انگشت', handleDisableBiometric)}

      {step === 'change-pin' && (
        <form onSubmit={handleChangePin} className="app-lock-form">
          <div className="form-group">
            <label>رمز فعلی</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="رمز فعلی"
              disabled={loading}
              dir="ltr"
            />
          </div>
          <div className="form-group">
            <label>رمز جدید</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="حداقل ۴ رقم"
              disabled={loading}
              dir="ltr"
            />
          </div>
          <div className="form-group">
            <label>تکرار رمز جدید</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="تکرار رمز"
              disabled={loading}
              dir="ltr"
            />
          </div>
          <div className="app-lock-form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading && <span className="spinner" />}
              ذخیره رمز جدید
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetForm}
              disabled={loading}
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {enabled && step === 'idle' && getAppLockConfig() && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
          رمز روی همه دستگاه‌ها یکسان است. اثر انگشت را در هر دستگاه جداگانه فعال کنید.
        </p>
      )}
    </div>
  );
}
