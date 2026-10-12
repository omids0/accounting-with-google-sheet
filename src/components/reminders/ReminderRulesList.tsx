import type { ReactNode } from 'react'

import ReminderPermissionPrompt from './ReminderPermissionPrompt'
import ReminderRuleRow from './ReminderRuleRow'
import type { ReminderPermission } from './useReminderPermission'
import type { ReminderKind, ReminderRule } from '../../types'
import Card from '../ui/Card'
import { reminderTextButtonClass } from '../ui/reminderStyles'

const DUE_DATE_KINDS = ['installments', 'checks', 'dang'] as const

const VEHICLE_KINDS = ['vehicle-mileage', 'vehicle-deadline', 'vehicle-periodic-service'] as const

const DUE_DATE_HINTS: Record<(typeof DUE_DATE_KINDS)[number], string> = {
  installments: 'قسط‌های پرداخت‌نشده',
  checks: 'چک‌های پرداخت‌نشده',
  dang: 'بدهی‌های پرداخت‌نشده'
}

const VEHICLE_HINTS: Record<(typeof VEHICLE_KINDS)[number], string> = {
  'vehicle-mileage': 'وقت ثبت کارکرد، طبق بازهٔ پروفایل هر خودرو',
  'vehicle-deadline': 'موعدهای خودرو؛ فاصلهٔ هر موعد در فرم خودش',
  'vehicle-periodic-service': 'سرویس‌هایی که به کیلومتر هدف نزدیک شده‌اند'
}

const DEFAULT_REASON =
  'برای اینکه این یادآوری سر وقت به دستتان برسد، اپ باید اجازهٔ نمایش اعلان داشته باشد.'

const NIGHTLY_REASON =
  'جمع‌بندی شبانه خبر می‌دهد چند پیامک بانکی ثبت نشده یا امروز چیزی ثبت نکرده‌اید؛ برای این کار اپ ' +
  'باید اجازهٔ نمایش اعلان داشته باشد.'

interface ReminderRulesListProps {
  rules: Record<ReminderKind, ReminderRule>
  savingKind: ReminderKind | null
  hasVehicle: boolean
  permission: ReminderPermission
  onChange: (kind: ReminderKind, patch: Partial<ReminderRule>) => void
  onGrant: () => void
  onManagePersonal: () => void
}

export default function ReminderRulesList({
  rules,
  savingKind,
  hasVehicle,
  permission,
  onChange,
  onGrant,
  onManagePersonal
}: ReminderRulesListProps) {
  const row = (kind: ReminderKind, hint: ReactNode, withDaysBefore = false) => (
    <ReminderRuleRow
      key={kind}
      rule={rules[kind]}
      hint={hint}
      withDaysBefore={withDaysBefore}
      busy={savingKind === kind}
      onChange={patch => onChange(kind, patch)}
    >
      {permission.blockedKind === kind && (
        <ReminderPermissionPrompt
          reason={kind === 'nightly' ? NIGHTLY_REASON : DEFAULT_REASON}
          native={permission.native}
          denied={permission.status === 'denied'}
          requesting={permission.requesting}
          onGrant={onGrant}
          onDismiss={permission.dismiss}
        />
      )}
    </ReminderRuleRow>
  )

  const nightlyHint = permission.native
    ? 'پیامک‌های بانکی ثبت‌نشده و اینکه امروز چیزی ثبت کرده‌اید یا نه'
    : 'اگر امروز چیزی ثبت نکرده باشید · شمار پیامک‌های بانکی فقط در اپ اندروید'

  return (
    <>
      <Card>
        {DUE_DATE_KINDS.map(kind => row(kind, DUE_DATE_HINTS[kind], true))}
        {row(
          'personal',
          <>
            قبض، بیمه و مواعد دیگر ·{' '}
            <button type="button" className={reminderTextButtonClass} onClick={onManagePersonal}>
              مدیریت مواعد
            </button>
          </>
        )}
      </Card>
      <Card>
        {row('nightly', nightlyHint)}
        {row('daily', 'اگر دیروز اپ را باز نکرده باشید')}
      </Card>
      {hasVehicle && <Card>{VEHICLE_KINDS.map(kind => row(kind, VEHICLE_HINTS[kind]))}</Card>}
    </>
  )
}
