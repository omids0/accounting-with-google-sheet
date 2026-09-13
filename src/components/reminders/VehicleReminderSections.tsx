import { DAYS_BEFORE_OPTIONS, HOUR_OPTIONS, MINUTE_OPTIONS } from './reminderConstants'
import { getReminderKindLabel } from '../../services/reminders'
import type { ReminderRule } from '../../types'
import { FormSelect } from '../form'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { reminderCheckboxRowClass, reminderRuleFieldsClass } from '../ui/reminderStyles'

interface VehicleMileageReminderSectionProps {
  rule: ReminderRule
  saving: boolean
  onUpdateRule: (patch: Partial<ReminderRule>) => void
  onSave: () => void
}

export function VehicleMileageReminderSection({
  rule,
  saving,
  onUpdateRule,
  onSave
}: VehicleMileageReminderSectionProps) {
  return (
    <Card>
      <CardTitle>{getReminderKindLabel('vehicle-mileage')}</CardTitle>
      <label className={reminderCheckboxRowClass}>
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={e => onUpdateRule({ enabled: e.target.checked })}
        />
        <span>یادآوری بروزرسانی کارکرد خودرو (بازه از پروفایل هر خودرو)</span>
      </label>

      <div className={reminderRuleFieldsClass}>
        <FormSelect
          label="ساعت ارسال"
          value={String(rule.hour)}
          onChange={value => onUpdateRule({ hour: Number(value) })}
          options={HOUR_OPTIONS}
          controlWidth="compact"
          compact
        />
        <FormSelect
          label="دقیقه"
          value={String(rule.minute)}
          onChange={value => onUpdateRule({ minute: Number(value) })}
          options={MINUTE_OPTIONS}
          controlWidth="compact"
          compact
        />
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        تا کاربر کارکرد را وارد نکند، مدال یادآوری در اپ نمایش داده می‌شود. بازهٔ زمانی (مثل «اول هر
        ماه شمسی») در پروفایل خودرو تنظیم می‌شود.
      </p>

      <Button
        type="button"
        variant="primary"
        size="sm"
        style={{ marginTop: '0.75rem' }}
        onClick={onSave}
        disabled={saving}
        loading={saving}
      >
        ذخیره تنظیمات
      </Button>
    </Card>
  )
}

interface VehicleDeadlineReminderSectionProps {
  rule: ReminderRule
  saving: boolean
  onUpdateRule: (patch: Partial<ReminderRule>) => void
  onSave: () => void
}

export function VehicleDeadlineReminderSection({
  rule,
  saving,
  onUpdateRule,
  onSave
}: VehicleDeadlineReminderSectionProps) {
  return (
    <Card>
      <CardTitle>{getReminderKindLabel('vehicle-deadline')}</CardTitle>
      <label className={reminderCheckboxRowClass}>
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={e => onUpdateRule({ enabled: e.target.checked })}
        />
        <span>یادآوری بیمه، معاینه فنی و موعدهای خودرو</span>
      </label>

      <div className={reminderRuleFieldsClass}>
        <FormSelect
          label="چند روز قبل از پایان؟"
          value={String(rule.daysBefore)}
          onChange={value => onUpdateRule({ daysBefore: Number(value) })}
          options={DAYS_BEFORE_OPTIONS}
          controlWidth="compact"
          compact
        />
        <FormSelect
          label="ساعت ارسال"
          value={String(rule.hour)}
          onChange={value => onUpdateRule({ hour: Number(value) })}
          options={HOUR_OPTIONS}
          controlWidth="compact"
          compact
        />
        <FormSelect
          label="دقیقه"
          value={String(rule.minute)}
          onChange={value => onUpdateRule({ minute: Number(value) })}
          options={MINUTE_OPTIONS}
          controlWidth="compact"
          compact
        />
      </div>

      <Button
        type="button"
        variant="primary"
        size="sm"
        style={{ marginTop: '0.75rem' }}
        onClick={onSave}
        disabled={saving}
        loading={saving}
      >
        ذخیره تنظیمات
      </Button>
    </Card>
  )
}
