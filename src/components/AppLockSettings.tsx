import AppIcon from './AppIcon'
import { ChangePinForm, CurrentPinForm, PinFieldsForm } from './appLock/AppLockForms'
import { useAppLockSettings } from './appLock/useAppLockSettings'
import { getAppLockConfig } from '../services/appLock'

export default function AppLockSettings() {
  const lock = useAppLockSettings()

  return (
    <div className="card">
      <h2 className="card-title">قفل اپ</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        رمز قفل در Google Sheet ذخیره می‌شود و روی همه دستگاه‌ها اعمال می‌شود. اثر انگشت فقط روی
        همین دستگاه فعال می‌شود. با خروج از اپ یا تعویض برنامه، قفل دوباره فعال می‌شود.
      </p>

      <div className="app-lock-status">
        <span
          className={`status-badge ${lock.enabled ? 'status-connected' : 'status-disconnected'}`}
        >
          {lock.enabled ? (
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
        {lock.enabled && lock.biometricOn && (
          <span className="status-badge status-connected">
            <AppIcon name="fingerprint" size={12} strokeWidth={2.5} />
            اثر انگشت
          </span>
        )}
      </div>

      {lock.step === 'idle' && !lock.enabled && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => lock.setStep('setup')}
        >
          فعال‌سازی قفل اپ
        </button>
      )}

      {lock.step === 'setup' && (
        <PinFieldsForm
          step={lock.step}
          loading={lock.loading}
          pinValue={lock.pin}
          confirmValue={lock.confirmPin}
          useBiometric={lock.useBiometric}
          biometricAvailable={lock.biometricAvailable}
          submitLabel="فعال‌سازی"
          onPinChange={lock.setPin}
          onConfirmChange={lock.setConfirmPin}
          onUseBiometricChange={lock.setUseBiometric}
          onSubmit={lock.handleEnable}
          onCancel={lock.resetForm}
        />
      )}

      {lock.step === 'idle' && lock.enabled && (
        <div className="app-lock-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => lock.setStep('change-pin')}
          >
            تغییر رمز
          </button>
          {lock.biometricAvailable && !lock.biometricOn && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void lock.handleEnableBiometric()}
              disabled={lock.loading}
            >
              فعال‌سازی اثر انگشت
            </button>
          )}
          {lock.biometricOn && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => lock.setStep('disable-biometric')}
            >
              غیرفعال‌سازی اثر انگشت
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => lock.setStep('disable')}
          >
            غیرفعال کردن قفل
          </button>
        </div>
      )}

      {lock.step === 'disable' && (
        <CurrentPinForm
          loading={lock.loading}
          currentPin={lock.currentPin}
          submitLabel="غیرفعال کردن قفل"
          onCurrentPinChange={lock.setCurrentPin}
          onSubmit={lock.handleDisable}
          onCancel={lock.resetForm}
        />
      )}

      {lock.step === 'disable-biometric' && (
        <CurrentPinForm
          loading={lock.loading}
          currentPin={lock.currentPin}
          submitLabel="غیرفعال کردن اثر انگشت"
          onCurrentPinChange={lock.setCurrentPin}
          onSubmit={lock.handleDisableBiometric}
          onCancel={lock.resetForm}
        />
      )}

      {lock.step === 'change-pin' && (
        <ChangePinForm
          loading={lock.loading}
          currentPin={lock.currentPin}
          pin={lock.pin}
          confirmPin={lock.confirmPin}
          onCurrentPinChange={lock.setCurrentPin}
          onPinChange={lock.setPin}
          onConfirmPinChange={lock.setConfirmPin}
          onSubmit={lock.handleChangePin}
          onCancel={lock.resetForm}
        />
      )}

      {lock.enabled && lock.step === 'idle' && getAppLockConfig() && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
          رمز روی همه دستگاه‌ها یکسان است. اثر انگشت را در هر دستگاه جداگانه فعال کنید.
        </p>
      )}
    </div>
  )
}
