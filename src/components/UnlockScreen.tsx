import { type FormEvent, useEffect, useRef, useState } from 'react'

import AppIcon from './AppIcon'
import { isBiometricEnabled, verifyBiometric, verifyPin } from '../services/appLock'
import { getUserName } from '../services/auth'

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
    <div className="login-page">
      <div className="login-card animate-in unlock-card">
        <div className="login-logo">
          <span className="icon">
            <AppIcon name="lock" />
          </span>
          <h1>قفل اپ</h1>
          <p>
            {displayName ? `سلام ${displayName}، ` : ''}
            برای مشاهده اطلاعات مالی، قفل را باز کنید
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="unlock-pin">رمز ورود</label>
            <input
              ref={inputRef}
              id="unlock-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="unlock-pin-input"
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
            <div className="alert alert-error unlock-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || pin.length < 4}
            aria-busy={loading}
          >
            {loading ? <span className="spinner" /> : 'باز کردن قفل'}
          </button>
        </form>

        {biometricReady && (
          <button
            type="button"
            className="btn btn-secondary unlock-biometric-btn"
            onClick={() => void handleBiometric()}
            disabled={loading}
          >
            <AppIcon name="fingerprint" size={18} strokeWidth={2} />
            ورود با اثر انگشت
          </button>
        )}

        <p className="login-footer-note">رمز روی همه دستگاه‌ها یکسان است</p>
      </div>
    </div>
  )
}
