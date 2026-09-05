import {
  APP_LOCK_POLICY_OPTIONS,
  IDLE_MINUTE_OPTIONS,
  getPolicyDescription
} from '../../services/appLockPolicy'
import type { AppLockPolicy } from '../../types'
import { FormSelect } from '../form'

interface AppLockPolicySettingsProps {
  policy: AppLockPolicy
  idleMinutes: number
  onPolicyChange: (policy: AppLockPolicy) => void
  onIdleMinutesChange: (minutes: number) => void
  onLockNow: () => void
}

export default function AppLockPolicySettings({
  policy,
  idleMinutes,
  onPolicyChange,
  onIdleMinutesChange,
  onLockNow
}: AppLockPolicySettingsProps) {
  return (
    <div className="app-lock-policy">
      <FormSelect
        label="زمان درخواست رمز"
        value={policy}
        onChange={next => onPolicyChange(next as AppLockPolicy)}
        options={APP_LOCK_POLICY_OPTIONS.map(option => ({
          value: option.value,
          label: option.label
        }))}
        hint={<p className="app-lock-policy-hint">{getPolicyDescription(policy)}</p>}
      />

      {policy === 'idle' && (
        <div className="app-lock-policy-idle">
          <FormSelect
            label="مدت بی‌فعالیت"
            value={String(idleMinutes)}
            onChange={next => onIdleMinutesChange(Number(next))}
            options={IDLE_MINUTE_OPTIONS.map(minutes => ({
              value: String(minutes),
              label: `${minutes} دقیقه`
            }))}
          />
        </div>
      )}

      {(policy === 'manual' || policy === 'background' || policy === 'session') && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onLockNow}>
          قفل الان
        </button>
      )}
    </div>
  )
}
