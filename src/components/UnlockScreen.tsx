import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import AppIcon from './AppIcon'
import UnlockPinInput from './appLock/UnlockPinInput'
import { usePinRecovery } from './appLock/usePinRecovery'
import { useUnlockLockout, wrongPinMessage } from './appLock/useUnlockLockout'
import ConfirmActionModal from './ConfirmActionModal'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { animateInClass } from './ui/layoutStyles'
import {
  unlockActionsClass,
  unlockBackdropOrbAccentClass,
  unlockBackdropOrbPrimaryClass,
  unlockBiometricBtnClass,
  unlockBodyClass,
  unlockCardClass,
  unlockCardHeroClass,
  unlockDividerClass,
  unlockDividerLineClass,
  unlockErrorClass,
  unlockFooterClass,
  unlockForgotLinkClass,
  unlockGreetingClass,
  unlockHintClass,
  unlockIconWrapClass,
  unlockPageClass,
  unlockPrimaryBtnClass,
  unlockSubtitleClass,
  unlockTitleClass,
  unlockTrustBadgeClass
} from './ui/unlockStyles'
import {
  canUnlockWithBiometric,
  getStoredPinLength,
  isBiometricEnabled,
  LEGACY_PIN_MIN_LENGTH,
  unlockWithBiometric,
  unlockWithPin
} from '../services/appLock'
import { getUserName } from '../services/auth'
import { cn } from '../utils/cn'

interface UnlockScreenProps {
  onUnlock: () => void
}

export default function UnlockScreen({ onUnlock }: UnlockScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  // PIN checks and the (often silent) biometric prompt load separately, so a
  // pending fingerprint prompt never greys out the PIN button.
  const [pinLoading, setPinLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [biometricReady, setBiometricReady] = useState(false)
  // Fingerprint is on but its key copy does not exist yet (lock from before encryption).
  const [biometricNeedsPin, setBiometricNeedsPin] = useState(false)
  const [pinLength] = useState(getStoredPinLength)
  const { locked, lockoutMessage, registerFailure, registerSuccess } = useUnlockLockout()
  const recovery = usePinRecovery()

  const minPinLength = pinLength ?? LEGACY_PIN_MIN_LENGTH

  const biometricTried = useRef(false)

  const handleBiometric = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setError('')
      setBiometricLoading(true)
      try {
        const ok = await unlockWithBiometric()

        if (ok) {
          registerSuccess()
          onUnlock()
        } else if (!silent) {
          setError('اثر انگشت تأیید نشد')
        }
      } catch {
        if (!silent) {
          setError('اثر انگشت در دسترس نیست')
        }
      } finally {
        setBiometricLoading(false)
      }
    },
    [onUnlock, registerSuccess]
  )

  useEffect(() => {
    let cancelled = false

    void canUnlockWithBiometric().then(ready => {
      if (cancelled) return

      setBiometricReady(ready)
      setBiometricNeedsPin(!ready && isBiometricEnabled())

      if (!ready || biometricTried.current) return

      biometricTried.current = true
      void handleBiometric({ silent: true })
    })

    return () => {
      cancelled = true
    }
  }, [handleBiometric])

  const attemptPinUnlock = useCallback(
    async (pinToVerify: string) => {
      if (locked) return

      if (pinToVerify.length < minPinLength) {
        setError('رمز را وارد کنید')

        return
      }

      setPinLoading(true)
      setError('')
      try {
        const ok = await unlockWithPin(pinToVerify)

        if (ok) {
          registerSuccess()
          onUnlock()
        } else {
          registerFailure()
          setError(wrongPinMessage())
          setPin('')
        }
      } finally {
        setPinLoading(false)
      }
    },
    [locked, minPinLength, onUnlock, registerFailure, registerSuccess]
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (pinLoading) return

    await attemptPinUnlock(pin)
  }

  const displayName = getUserName()

  const message = lockoutMessage || error || recovery.error

  return (
    <div className={unlockPageClass}>
      <div className={unlockBackdropOrbPrimaryClass} aria-hidden="true" />
      <div className={unlockBackdropOrbAccentClass} aria-hidden="true" />

      <div className={cn(unlockCardClass, animateInClass)}>
        <header className={unlockCardHeroClass}>
          <span className={unlockIconWrapClass} aria-hidden="true">
            <AppIcon name="lock" size={32} strokeWidth={2.25} />
          </span>
          <h1 className={unlockTitleClass}>قفل اپ</h1>
          {displayName ? <p className={unlockGreetingClass}>سلام {displayName}</p> : null}
          <p className={unlockSubtitleClass}>برای مشاهده اطلاعات مالی، قفل را باز کنید</p>
        </header>

        <div className={unlockBodyClass}>
          <form onSubmit={handleSubmit} className={unlockActionsClass} autoComplete="off">
            <UnlockPinInput
              id="unlock-pin"
              value={pin}
              onChange={nextPin => {
                setPin(nextPin)
                setError('')
              }}
              onComplete={nextPin => {
                void attemptPinUnlock(nextPin)
              }}
              length={pinLength}
              disabled={pinLoading || locked || recovery.working}
              hasError={!!message}
              autoFocus
            />

            {message && (
              <Alert
                variant="error"
                id="unlock-pin-error"
                className={unlockErrorClass}
                role={lockoutMessage ? 'timer' : 'alert'}
              >
                {message}
              </Alert>
            )}

            <Button
              type="submit"
              variant="primary"
              className={unlockPrimaryBtnClass(!pinLoading && pin.length < minPinLength)}
              disabled={pinLoading || locked || recovery.working || pin.length < minPinLength}
              loading={pinLoading}
            >
              باز کردن قفل
            </Button>
          </form>

          {biometricReady && (
            <>
              <div className={unlockDividerClass} aria-hidden="true">
                <span className={unlockDividerLineClass} />
                <span>یا</span>
                <span className={unlockDividerLineClass} />
              </div>

              <Button
                type="button"
                variant="secondary"
                className={unlockBiometricBtnClass}
                onClick={() => void handleBiometric()}
                disabled={pinLoading || biometricLoading || recovery.working}
                loading={biometricLoading}
              >
                <AppIcon name="fingerprint" size={20} strokeWidth={2} />
                ورود با اثر انگشت
              </Button>
            </>
          )}

          {biometricNeedsPin && (
            <p className={unlockHintClass}>
              بعد از به‌روزرسانی، یک بار با رمز وارد شوید تا اثر انگشت دوباره کار کند.
            </p>
          )}

          <footer className={unlockFooterClass}>
            <div className={unlockTrustBadgeClass}>
              <AppIcon name="check" size={14} strokeWidth={2.25} />
              <span>رمز فقط برای همین دستگاه است</span>
            </div>
            <button
              type="button"
              className={unlockForgotLinkClass}
              onClick={recovery.start}
              disabled={pinLoading || recovery.working}
            >
              {recovery.working ? 'در حال ورود با گوگل…' : 'رمز را فراموش کرده‌ام'}
            </button>
          </footer>
        </div>
      </div>

      <ConfirmActionModal {...recovery.modalProps} />
    </div>
  )
}
