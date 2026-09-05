import { type FormEvent, useEffect, useRef, useState } from 'react'

import AppIcon from './AppIcon'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { spinnerClass } from './ui/displayStyles'
import { unlockFormGroupClass, unlockFormLabelClass } from './ui/formControlStyles'
import { formControlClassName } from './ui/formStyles'
import { animateInClass } from './ui/layoutStyles'
import {
  loginCardClass,
  loginFooterNoteClass,
  loginLogoClass,
  loginLogoIconClass,
  loginLogoSubtitleClass,
  loginLogoTitleClass,
  loginPageClass,
  unlockBiometricBtnClass,
  unlockCardClass,
  unlockErrorClass,
  unlockPinInputClass
} from './ui/loginStyles'
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

  const inputRef = useRef<HTMLInputElement>(null)

  const biometricTried = useRef(false)

  useEffect(() => {
    setBiometricReady(isBiometricEnabled())
    inputRef.current?.focus()
  }, [])

  const handleBiometric = async () => {
    setError('')
    setLoading(true)
    try {
      const ok = await verifyBiometric()

      if (ok) {
        onUnlock()
      } else {
        setError('اثر انگشت تأیید نشد')
      }
    } catch {
      setError('اثر انگشت در دسترس نیست')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isBiometricEnabled() || biometricTried.current) return
    biometricTried.current = true
    void handleBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        inputRef.current?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  const displayName = getUserName()

  return (
    <div className={loginPageClass}>
      <div className={cn(loginCardClass, animateInClass, unlockCardClass)}>
        <div className={loginLogoClass}>
          <span className={loginLogoIconClass}>
            <AppIcon name="lock" />
          </span>
          <h1 className={loginLogoTitleClass}>قفل اپ</h1>
          <p className={loginLogoSubtitleClass}>
            {displayName ? `سلام ${displayName}، ` : ''}
            برای مشاهده اطلاعات مالی، قفل را باز کنید
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className={unlockFormGroupClass}>
            <label className={unlockFormLabelClass} htmlFor="unlock-pin">
              رمز ورود
            </label>
            <input
              ref={inputRef}
              id="unlock-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className={cn(formControlClassName(), unlockPinInputClass)}
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              placeholder="رمز ۴ رقمی"
              disabled={loading}
              dir="ltr"
            />
          </div>

          {error && (
            <Alert variant="error" className={unlockErrorClass}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || pin.length < 4}
            aria-busy={loading}
          >
            {loading ? <span className={spinnerClass} /> : 'باز کردن قفل'}
          </Button>
        </form>

        {biometricReady && (
          <Button
            type="button"
            variant="secondary"
            className={unlockBiometricBtnClass}
            onClick={() => void handleBiometric()}
            disabled={loading}
          >
            <AppIcon name="fingerprint" size={18} strokeWidth={2} />
            ورود با اثر انگشت
          </Button>
        )}

        <p className={loginFooterNoteClass}>رمز روی همه دستگاه‌ها یکسان است</p>
      </div>
    </div>
  )
}
