import { APP_LOCK_POLICY_OPTIONS, IDLE_MINUTE_OPTIONS } from '../../services/appLockPolicy'
import type { AppLockPolicy } from '../../types'
import AppIcon from '../AppIcon'
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
      <div className="form-field form-group">
        <span className="form-field-label">
          <span className="form-field-label-text">زمان درخواست رمز</span>
        </span>

        <div className="app-lock-policy-list" role="radiogroup" aria-label="زمان درخواست رمز">
          {APP_LOCK_POLICY_OPTIONS.map(option => {
            const selected = policy === option.value

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`app-lock-policy-option${selected ? ' is-selected' : ''}`}
                onClick={() => onPolicyChange(option.value)}
              >
                <span className="app-lock-policy-option-main">
                  <span className="app-lock-policy-option-radio" aria-hidden="true">
                    {selected && <AppIcon name="check" size={12} strokeWidth={2.5} />}
                  </span>
                  <span className="app-lock-policy-option-label">{option.label}</span>
                </span>
                <span className="app-lock-policy-option-description">{option.description}</span>
              </button>
            )
          })}
        </div>
      </div>

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
