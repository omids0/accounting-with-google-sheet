import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import AppIcon from './AppIcon'
import UnlockPinInput from './appLock/UnlockPinInput'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { spinnerClass } from './ui/displayStyles'
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

export default function UnlockScreen({ onUnlock }: UnlockScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricReady, setBiometricReady] = useState(false)

  const biometricTried = useRef(false)

  const handleBiometric = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setError('')
      setLoading(true)
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
        setLoading(false)
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!pin.trim()) {
      setError('رمز را وارد کنید')

      return
    }

    setLoading(true)
    setError('')
    try {
      const ok = await verifyPin(pin)

      if (ok) {
        onUnlock()
      } else {
        setError('رمز اشتباه است')
        setPin('')
      }
    } finally {
      setLoading(false)
    }
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
          <form onSubmit={handleSubmit} className={unlockActionsClass}>
            <UnlockPinInput
              id="unlock-pin"
              value={pin}
              onChange={nextPin => {
                setPin(nextPin)
                setError('')
              }}
              disabled={loading}
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
              disabled={loading || pin.length < 4}
              aria-busy={loading}
            >
              {loading ? <span className={spinnerClass} /> : 'باز کردن قفل'}
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
                disabled={loading}
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
