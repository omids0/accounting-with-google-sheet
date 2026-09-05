import { APP_LOCK_POLICY_OPTIONS, IDLE_MINUTE_OPTIONS } from '../../services/appLockPolicy'
import type { AppLockPolicy } from '../../types'
import { cn } from '../../utils/cn'
import type { AppIconName } from '../AppIcon'
import AppIcon from '../AppIcon'
import { FormSelect } from '../form'
import {
  appLockPolicyClass,
  appLockPolicyIdleClass,
  appLockPolicyListClass,
  appLockPolicyOptionClass,
  appLockPolicyOptionDescriptionClass,
  appLockPolicyOptionIconClass,
  appLockPolicyOptionLabelClass,
  appLockPolicyOptionMainClass,
  appLockPolicyOptionRadioClass,
  appLockSectionClass,
  appLockSectionTitleClass
} from '../ui/appLockStyles'
import Button from '../ui/Button'
import {
  formFieldClass,
  formFieldLabelClass,
  formFieldLabelTextClass,
  formGroupClass
} from '../ui/formControlStyles'

const POLICY_ICONS: Record<AppLockPolicy, AppIconName> = {
  background: 'swap',
  session: 'clock',
  always: 'lock',
  idle: 'clock',
  manual: 'settings'
}

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
    <section className={cn(appLockSectionClass, appLockPolicyClass)}>
      <h3 className={appLockSectionTitleClass}>زمان درخواست رمز</h3>

      <div className={cn(formFieldClass, formGroupClass)}>
        <span className={formFieldLabelClass}>
          <span className={formFieldLabelTextClass}>سیاست قفل</span>
        </span>

        <div className={appLockPolicyListClass} role="radiogroup" aria-label="زمان درخواست رمز">
          {APP_LOCK_POLICY_OPTIONS.map(option => {
            const selected = policy === option.value

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={appLockPolicyOptionClass(selected)}
                onClick={() => onPolicyChange(option.value)}
              >
                <span className={appLockPolicyOptionMainClass}>
                  <span className={appLockPolicyOptionIconClass(selected)} aria-hidden="true">
                    <AppIcon name={POLICY_ICONS[option.value]} size={16} strokeWidth={2.1} />
                  </span>
                  <span className={appLockPolicyOptionLabelClass}>{option.label}</span>
                  <span className={appLockPolicyOptionRadioClass(selected)} aria-hidden="true">
                    {selected && <AppIcon name="check" size={10} strokeWidth={2.5} />}
                  </span>
                </span>
                <span className={appLockPolicyOptionDescriptionClass}>{option.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {policy === 'idle' && (
        <div className={appLockPolicyIdleClass}>
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
        <Button type="button" variant="secondary" size="sm" onClick={onLockNow}>
          قفل الان
        </Button>
      )}
    </section>
  )
}
