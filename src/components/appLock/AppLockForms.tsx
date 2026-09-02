import { type FormEvent } from 'react'

import { FormField } from '../form'

type SetupStep = 'idle' | 'setup' | 'disable' | 'change-pin' | 'disable-biometric'

interface PinFieldsFormProps {
  step: SetupStep
  loading: boolean
  pinValue: string
  confirmValue: string
  useBiometric: boolean
  biometricAvailable: boolean
  submitLabel: string
  onPinChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onUseBiometricChange: (checked: boolean) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}

export function PinFieldsForm({
  step,
  loading,
  pinValue,
  confirmValue,
  useBiometric,
  biometricAvailable,
  submitLabel,
  onPinChange,
  onConfirmChange,
  onUseBiometricChange,
  onSubmit,
  onCancel
}: PinFieldsFormProps) {
  return (
    <form onSubmit={onSubmit} className="app-lock-form">
      <FormField label={step === 'change-pin' ? 'رمز جدید' : 'رمز'}>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={pinValue}
          onChange={e => onPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="حداقل ۴ رقم"
          disabled={loading}
          dir="ltr"
        />
      </FormField>
      <FormField label="تکرار رمز">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={confirmValue}
          onChange={e => onConfirmChange(e.target.value.replace(/\D/g, ''))}
          placeholder="تکرار رمز"
          disabled={loading}
          dir="ltr"
        />
      </FormField>
      {step === 'setup' && biometricAvailable && (
        <label className="app-lock-checkbox">
          <input
            type="checkbox"
            checked={useBiometric}
            onChange={e => onUseBiometricChange(e.target.checked)}
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
          onClick={onCancel}
          disabled={loading}
        >
          انصراف
        </button>
      </div>
    </form>
  )
}

interface CurrentPinFormProps {
  loading: boolean
  currentPin: string
  submitLabel: string
  danger?: boolean
  onCurrentPinChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}

export function CurrentPinForm({
  loading,
  currentPin,
  submitLabel,
  danger = true,
  onCurrentPinChange,
  onSubmit,
  onCancel
}: CurrentPinFormProps) {
  return (
    <form onSubmit={onSubmit} className="app-lock-form">
      <FormField label="رمز فعلی">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={currentPin}
          onChange={e => onCurrentPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="رمز فعلی"
          disabled={loading}
          dir="ltr"
        />
      </FormField>
      <div className="app-lock-form-actions">
        <button
          type="submit"
          className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
          disabled={loading}
        >
          {loading && <span className="spinner" />}
          {submitLabel}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          disabled={loading}
        >
          انصراف
        </button>
      </div>
    </form>
  )
}

interface ChangePinFormProps {
  loading: boolean
  currentPin: string
  pin: string
  confirmPin: string
  onCurrentPinChange: (value: string) => void
  onPinChange: (value: string) => void
  onConfirmPinChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}

export function ChangePinForm({
  loading,
  currentPin,
  pin,
  confirmPin,
  onCurrentPinChange,
  onPinChange,
  onConfirmPinChange,
  onSubmit,
  onCancel
}: ChangePinFormProps) {
  return (
    <form onSubmit={onSubmit} className="app-lock-form">
      <FormField label="رمز فعلی">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={currentPin}
          onChange={e => onCurrentPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="رمز فعلی"
          disabled={loading}
          dir="ltr"
        />
      </FormField>
      <FormField label="رمز جدید">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={pin}
          onChange={e => onPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="حداقل ۴ رقم"
          disabled={loading}
          dir="ltr"
        />
      </FormField>
      <FormField label="تکرار رمز جدید">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={confirmPin}
          onChange={e => onConfirmPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="تکرار رمز"
          disabled={loading}
          dir="ltr"
        />
      </FormField>
      <div className="app-lock-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading && <span className="spinner" />}
          ذخیره رمز جدید
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          disabled={loading}
        >
          انصراف
        </button>
      </div>
    </form>
  )
}
