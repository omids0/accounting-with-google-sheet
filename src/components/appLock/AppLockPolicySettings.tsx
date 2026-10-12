import { useState } from 'react'

import {
  APP_LOCK_COLD_START_NOTE,
  APP_LOCK_POLICY_OPTIONS,
  DEFAULT_IDLE_MINUTES,
  getPolicyLabel,
  IDLE_MINUTE_OPTIONS
} from '../../services/appLockPolicy'
import { PRIVACY_SCREEN_ANDROID_NOTE } from '../../services/privacyScreen'
import type { AppLockPolicy } from '../../types'
import { cn } from '../../utils/cn'
import type { AppIconName } from '../AppIcon'
import AppIcon from '../AppIcon'
import { CheckboxField, FormSelect } from '../form'
import {
  appLockPolicyClass,
  appLockPolicyIdleClass,
  appLockPolicyListClass,
  appLockPolicyMoreToggleClass,
  appLockPolicyNoteClass,
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

const POLICY_ICONS: Record<AppLockPolicy, AppIconName> = {
  background: 'swap',
  session: 'clock',
  always: 'lock',
  idle: 'clock',
  manual: 'settings'
}

const PRIMARY_OPTIONS = APP_LOCK_POLICY_OPTIONS.filter(option => !option.advanced)

const ADVANCED_OPTIONS = APP_LOCK_POLICY_OPTIONS.filter(option => option.advanced)

interface AppLockPolicySettingsProps {
  /** `setup` is the step inside enabling the lock; `settings` saves each change. */
  mode: 'setup' | 'settings'
  policy: AppLockPolicy
  idleMinutes: number
  privacyScreen: boolean
  onPolicyChange: (policy: AppLockPolicy) => void
  onIdleMinutesChange: (minutes: number) => void
  onPrivacyScreenChange: (on: boolean) => void
  onLockNow?: () => void
}

export default function AppLockPolicySettings({
  mode,
  policy,
  idleMinutes,
  privacyScreen,
  onPolicyChange,
  onIdleMinutesChange,
  onPrivacyScreenChange,
  onLockNow
}: AppLockPolicySettingsProps) {
  const [moreOpen, setMoreOpen] = useState(
    () =>
      ADVANCED_OPTIONS.some(option => option.value === policy) ||
      idleMinutes !== DEFAULT_IDLE_MINUTES
  )

  const renderOption = (option: (typeof APP_LOCK_POLICY_OPTIONS)[number]) => {
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
            <AppIcon name={POLICY_ICONS[option.value]} size={16} />
          </span>
          <span className={appLockPolicyOptionLabelClass}>
            {getPolicyLabel(option.value, idleMinutes)}
          </span>
          <span className={appLockPolicyOptionRadioClass(selected)} aria-hidden="true">
            {selected && <AppIcon name="check" size={10} />}
          </span>
        </span>
        <span className={appLockPolicyOptionDescriptionClass}>{option.description}</span>
      </button>
    )
  }

  return (
    <section className={cn(appLockSectionClass, appLockPolicyClass)}>
      <h3 className={appLockSectionTitleClass}>
        {mode === 'setup' ? 'کی دوباره قفل شود؟' : 'زمان درخواست رمز'}
      </h3>
      <p className={appLockPolicyNoteClass}>یک لحظه رفتن به پیامک‌ها و برگشتن نباید رمز بخواهد.</p>

      <div className={appLockPolicyListClass} role="radiogroup" aria-label="زمان درخواست رمز">
        {PRIMARY_OPTIONS.map(renderOption)}
        {ADVANCED_OPTIONS.filter(option => moreOpen || option.value === policy).map(renderOption)}
      </div>

      <button
        type="button"
        className={appLockPolicyMoreToggleClass}
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen(open => !open)}
      >
        {moreOpen ? 'گزینه‌های کمتر' : 'گزینه‌های بیشتر (همیشه، فقط دستی، مدت بی‌فعالیت)'}
        <AppIcon name="chevron-down" size={14} className={cn(moreOpen && 'rotate-180')} />
      </button>

      {moreOpen && policy === 'idle' && (
        <div className={appLockPolicyIdleClass}>
          <FormSelect
            label="مدت بی‌فعالیت"
            value={String(idleMinutes)}
            onChange={next => onIdleMinutesChange(Number(next))}
            options={IDLE_MINUTE_OPTIONS.map(minutes => ({
              value: String(minutes),
              label: `${minutes.toLocaleString('fa-IR')} دقیقه`
            }))}
          />
        </div>
      )}

      <CheckboxField
        checked={privacyScreen}
        onChange={onPrivacyScreenChange}
        label="محو کردن اپ در پس‌زمینه"
        hint={`در فهرست برنامه‌های اخیر محتوای اپ دیده نمی‌شود. ${PRIVACY_SCREEN_ANDROID_NOTE}`}
      />

      <p className={appLockPolicyNoteClass}>{APP_LOCK_COLD_START_NOTE}</p>

      {onLockNow && (policy === 'manual' || policy === 'background' || policy === 'session') && (
        <Button type="button" variant="secondary" size="sm" onClick={onLockNow}>
          قفل الان
        </Button>
      )}
    </section>
  )
}
