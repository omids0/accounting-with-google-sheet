import { HOUR_OPTIONS, MINUTE_OPTIONS } from './reminderConstants'
import { getReminderKindLabel } from '../../services/reminders'
import type { ReminderRule } from '../../types'
import { FormSelect } from '../form'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

interface PersonalRemindersPushSectionProps {
  personalRule: ReminderRule
  saving: boolean
  onUpdateRule: (patch: Partial<ReminderRule>) => void
  onSave: () => void
  onManage: () => void
}

export default function PersonalRemindersPushSection({
  personalRule,
  saving,
  onUpdateRule,
  onSave,
  onManage
}: PersonalRemindersPushSectionProps) {
  return (
    <Card>
      <CardTitle>{getReminderKindLabel('personal')}</CardTitle>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        قبض، بیمه و سایر مواعد را از بخش «یادآوری» در منو ثبت کنید. «روز قبل» برای هر مورد جداگانه
        تنظیم می‌شود.
      </p>

      <label
        className="checkbox-row"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <input
          type="checkbox"
          checked={personalRule.enabled}
          onChange={e => onUpdateRule({ enabled: e.target.checked })}
        />
        <span>ارسال نوتیف برای مواعد شخصی فعال</span>
      </label>

      <div
        style={{
          marginTop: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem'
        }}
      >
        <FormSelect
          label="ساعت ارسال"
          value={String(personalRule.hour)}
          onChange={value => onUpdateRule({ hour: Number(value) })}
          options={HOUR_OPTIONS}
        />
        <FormSelect
          label="دقیقه"
          value={String(personalRule.minute)}
          onChange={value => onUpdateRule({ minute: Number(value) })}
          options={MINUTE_OPTIONS}
        />
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Button type="button" variant="secondary" size="sm" onClick={onManage}>
          مدیریت مواعد شخصی
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={saving}>
          {saving && <span className="spinner" />}
          ذخیره تنظیمات
        </Button>
      </div>
    </Card>
  )
}
