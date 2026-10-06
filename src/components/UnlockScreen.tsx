import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import AppIcon from './AppIcon'
import UnlockPinInput from './appLock/UnlockPinInput'
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
  unlockGreetingClass,
  unlockIconWrapClass,
  unlockPageClass,
  unlockPrimaryBtnClass,
  unlockSubtitleClass,
  unlockTitleClass,
  unlockTrustBadgeClass
} from './ui/unlockStyles'
import { isBiometricEnabled, verifyBiometric, verifyPin } from '../services/appLock'
import { getUserName } from '../services/auth'
import { cn } from '../utils/cn'

interface UnlockScreenProps {
  onUnlock: () => void
}

const PIN_LENGTH = 4

export default function UnlockScreen({ onUnlock }: UnlockScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  // PIN checks and the (often silent) biometric prompt load separately, so a
  // pending fingerprint prompt never greys out the PIN button.
  const [pinLoading, setPinLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [biometricReady, setBiometricReady] = useState(false)

  const biometricTried = useRef(false)

  const handleBiometric = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setError('')
      setBiometricLoading(true)
      try {
        const ok = await verifyBiometric()

        if (ok) {
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
    [onUnlock]
  )

  useEffect(() => {
    const ready = isBiometricEnabled()

    setBiometricReady(ready)

    if (!ready || biometricTried.current) return

    biometricTried.current = true
    void handleBiometric({ silent: true })
  }, [handleBiometric])

  const attemptPinUnlock = useCallback(
    async (pinToVerify: string) => {
      if (pinToVerify.length < PIN_LENGTH) {
        setError('رمز را وارد کنید')

        return
      }

      setPinLoading(true)
      setError('')
      try {
        const ok = await verifyPin(pinToVerify)

        if (ok) {
          onUnlock()
        } else {
          setError('رمز اشتباه است')
          setPin('')
        }
      } finally {
        setPinLoading(false)
      }
    },
    [onUnlock]
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (pinLoading) return

    await attemptPinUnlock(pin)
  }

  const displayName = getUserName()

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
              disabled={pinLoading}
              hasError={!!error}
              autoFocus
            />

            {error && (
              <Alert variant="error" id="unlock-pin-error" className={unlockErrorClass}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="primary"
              className={unlockPrimaryBtnClass}
              disabled={pinLoading || pin.length < PIN_LENGTH}
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
                disabled={pinLoading || biometricLoading}
                loading={biometricLoading}
              >
                <AppIcon name="fingerprint" size={20} strokeWidth={2} />
                ورود با اثر انگشت
              </Button>
            </>
          )}

          <footer className={unlockFooterClass}>
            <div className={unlockTrustBadgeClass}>
              <AppIcon name="check" size={14} strokeWidth={2.25} />
              <span>رمز روی همه دستگاه‌ها یکسان است</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
