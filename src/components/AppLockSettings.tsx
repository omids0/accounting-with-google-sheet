import AppIcon from './AppIcon'
import AppLockBiometricRow from './appLock/AppLockBiometricRow'
import { ChangePinForm, CurrentPinForm, PinFieldsForm } from './appLock/AppLockForms'
import AppLockPolicySettings from './appLock/AppLockPolicySettings'
import { useAppLockSettings } from './appLock/useAppLockSettings'
import {
  appLockActionsClass,
  appLockBodyClass,
  appLockCardClass,
  appLockFootnoteClass,
  appLockHeroClass,
  appLockHeroContentClass,
  appLockHeroIconClass,
  appLockHeroSubtitleClass,
  appLockHeroTitleClass,
  appLockIntroClass,
  appLockPrimaryActionClass,
  appLockSectionClass,
  appLockSectionTitleClass,
  appLockStatusPillClass,
  appLockStatusStripClass
} from './ui/appLockStyles'
import Button from './ui/Button'
import { getAppLockConfig } from '../services/appLock'

export default function AppLockSettings() {
  const lock = useAppLockSettings()

  return (
    <div className={appLockCardClass}>
      <header className={appLockHeroClass}>
        <div className={appLockHeroContentClass}>
          <span className={appLockHeroIconClass} aria-hidden="true">
            <AppIcon name="lock" size={24} strokeWidth={2.25} />
          </span>
          <div>
            <h2 className={appLockHeroTitleClass}>قفل اپ</h2>
            <p className={appLockHeroSubtitleClass}>
              رمز، اثر انگشت و زمان قفل فقط برای همین دستگاه است؛ روی هر دستگاه جداگانه تنظیم کنید.
            </p>
          </div>
        </div>
      </header>

      <div className={appLockBodyClass}>
        <div className={appLockStatusStripClass}>
          <span className={appLockStatusPillClass(lock.enabled)}>
            <AppIcon name={lock.enabled ? 'lock' : 'x-mark'} size={12} strokeWidth={2.5} />
            {lock.enabled ? 'قفل فعال' : 'قفل غیرفعال'}
          </span>
          {lock.enabled && lock.biometricOn && (
            <span className={appLockStatusPillClass(true)}>
              <AppIcon name="fingerprint" size={12} strokeWidth={2.5} />
              اثر انگشت فعال
            </span>
          )}
        </div>

        {lock.enabled && lock.step === 'idle' && (
          <AppLockPolicySettings
            policy={lock.lockPolicy}
            idleMinutes={lock.idleMinutes}
            onPolicyChange={lock.handlePolicyChange}
            onIdleMinutesChange={lock.handleIdleMinutesChange}
            onLockNow={lock.handleLockNow}
          />
        )}

        {lock.step === 'idle' && !lock.enabled && (
          <section className={appLockSectionClass}>
            <h3 className={appLockSectionTitleClass}>فعال‌سازی</h3>
            <p className={appLockIntroClass}>
              با تعیین رمزی حداقل ۶ رقمی، اپ پشت قفل می‌رود و نسخهٔ اطلاعات مالی روی همین دستگاه هم
              رمزگذاری می‌شود.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={appLockPrimaryActionClass}
              onClick={() => lock.setStep('setup')}
            >
              فعال‌سازی قفل اپ
            </Button>
            <div className={appLockActionsClass}>
              <AppLockBiometricRow
                lockEnabled={false}
                available={lock.biometricAvailable}
                enabled={false}
                unavailableReason={lock.biometricUnavailableReason}
                detail={lock.biometricDetail}
                error={lock.biometricError}
                loading={lock.loading}
                onEnable={() => void lock.handleEnableBiometric()}
                onDisable={() => lock.setStep('disable-biometric')}
              />
            </div>
          </section>
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
          <section className={appLockSectionClass}>
            <h3 className={appLockSectionTitleClass}>مدیریت قفل</h3>
            <div className={appLockActionsClass}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => lock.setStep('change-pin')}
              >
                تغییر رمز
              </Button>
              <AppLockBiometricRow
                lockEnabled
                available={lock.biometricAvailable}
                enabled={lock.biometricOn}
                unavailableReason={lock.biometricUnavailableReason}
                detail={lock.biometricDetail}
                error={lock.biometricError}
                loading={lock.loading}
                onEnable={() => void lock.handleEnableBiometric()}
                onDisable={() => lock.setStep('disable-biometric')}
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => lock.setStep('disable')}
              >
                غیرفعال کردن قفل
              </Button>
            </div>
          </section>
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
          <p className={appLockFootnoteClass}>
            اطلاعات روی این دستگاه رمزگذاری شده و فقط با رمز یا اثر انگشت باز می‌شود. رمز در گوگل
            شیت ذخیره نمی‌شود؛ اگر فراموشش کنید، از صفحهٔ قفل با ورود دوباره به همین حساب گوگل
            می‌توانید قفل را بردارید.
          </p>
        )}
      </div>
    </div>
  )
}
