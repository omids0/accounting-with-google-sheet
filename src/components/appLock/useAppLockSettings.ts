import { type FormEvent, useEffect, useState } from 'react'

import {
  changePin,
  disableAppLock,
  disableBiometric,
  enableBiometric,
  isAppLockEnabled,
  isBiometricAvailable,
  isBiometricEnabled,
  setupAppLock,
  syncAppLockFromSheet,
  validatePinFormat
} from '../../services/appLock'
import { showError, showSuccess } from '../../utils/toast'

export type SetupStep = 'idle' | 'setup' | 'disable' | 'change-pin' | 'disable-biometric'

export function useAppLockSettings() {
  const [enabled, setEnabled] = useState(isAppLockEnabled)

  const [biometricAvailable, setBiometricAvailable] = useState(false)

  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled)

  const [step, setStep] = useState<SetupStep>('idle')

  const [pin, setPin] = useState('')

  const [confirmPin, setConfirmPin] = useState('')

  const [currentPin, setCurrentPin] = useState('')

  const [useBiometric, setUseBiometric] = useState(false)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void isBiometricAvailable().then(setBiometricAvailable)
    void syncAppLockFromSheet().then(() => {
      setEnabled(isAppLockEnabled())
      setBiometricOn(isBiometricEnabled())
    })
  }, [])

  const resetForm = () => {
    setStep('idle')
    setPin('')
    setConfirmPin('')
    setCurrentPin('')
    setUseBiometric(false)
  }

  const handleEnable = async (event: FormEvent) => {
    event.preventDefault()

    const formatError = validatePinFormat(pin)

    if (formatError) {
      showError(formatError)

      return
    }
    if (pin !== confirmPin) {
      showError('تکرار رمز با رمز اصلی یکسان نیست')

      return
    }

    setLoading(true)
    try {
      await setupAppLock(pin, useBiometric && biometricAvailable)
      setEnabled(true)
      setBiometricOn(useBiometric && biometricAvailable)
      showSuccess('قفل اپ فعال شد')
      resetForm()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در فعال‌سازی قفل')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      await disableAppLock(currentPin)
      setEnabled(false)
      setBiometricOn(false)
      showSuccess('قفل اپ غیرفعال شد')
      resetForm()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در غیرفعال‌سازی')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePin = async (event: FormEvent) => {
    event.preventDefault()

    const formatError = validatePinFormat(pin)

    if (formatError) {
      showError(formatError)

      return
    }
    if (pin !== confirmPin) {
      showError('تکرار رمز با رمز جدید یکسان نیست')

      return
    }

    setLoading(true)
    try {
      await changePin(currentPin, pin)
      showSuccess('رمز جدید ذخیره شد')
      resetForm()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در تغییر رمز')
    } finally {
      setLoading(false)
    }
  }

  const handleEnableBiometric = async () => {
    setLoading(true)
    try {
      await enableBiometric()
      setBiometricOn(true)
      showSuccess('اثر انگشت فعال شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در فعال‌سازی اثر انگشت')
    } finally {
      setLoading(false)
    }
  }

  const handleDisableBiometric = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      await disableBiometric(currentPin)
      setBiometricOn(false)
      showSuccess('اثر انگشت غیرفعال شد')
      resetForm()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در غیرفعال‌سازی اثر انگشت')
    } finally {
      setLoading(false)
    }
  }

  return {
    enabled,
    biometricAvailable,
    biometricOn,
    step,
    setStep,
    pin,
    setPin,
    confirmPin,
    setConfirmPin,
    currentPin,
    setCurrentPin,
    useBiometric,
    setUseBiometric,
    loading,
    resetForm,
    handleEnable,
    handleDisable,
    handleChangePin,
    handleEnableBiometric,
    handleDisableBiometric
  }
}
