import { DAYS_BEFORE_OPTIONS, HOUR_OPTIONS, MINUTE_OPTIONS } from './reminderConstants'
import { getReminderKindLabel } from '../../services/reminders'
import type { ReminderKind, ReminderRule } from '../../types'
import { FormSelect } from '../form'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

const DUE_DATE_DESCRIPTIONS: Record<'installments' | 'checks' | 'dang', string> = {
  installments: 'یادآوری اقساط پرداخت‌نشده',
  checks: 'یادآوری چک‌های پرداخت‌نشده',
  dang: 'یادآوری بدهی‌های پرداخت‌نشده'
}

interface DueDateReminderSectionProps {
  kind: 'installments' | 'checks' | 'dang'
  rule: ReminderRule
  previewLines: string[]
  saving: boolean
  onUpdateRule: (patch: Partial<ReminderRule>) => void
  onSave: () => void
}

export default function DueDateReminderSection({
  kind,
  rule,
  previewLines,
  saving,
  onUpdateRule,
  onSave
}: DueDateReminderSectionProps) {
  const emptyPreviewMessages: Record<'installments' | 'checks' | 'dang', string> = {
    installments: 'فعلاً قسط پرداخت‌نشده‌ای برای این بازه پیدا نشد.',
    checks: 'فعلاً چک پرداخت‌نشده‌ای برای این بازه پیدا نشد.',
    dang: 'فعلاً بدهی پرداخت‌نشده‌ای برای این بازه پیدا نشد.'
  }

  return (
    <Card>
      <CardTitle>{getReminderKindLabel(kind as ReminderKind)}</CardTitle>
      <label
        className="checkbox-row"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={e => onUpdateRule({ enabled: e.target.checked })}
        />
        <span>{DUE_DATE_DESCRIPTIONS[kind]}</span>
      </label>

      <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <FormSelect
          label="چند روز قبل از موعد؟"
          value={String(rule.daysBefore)}
          onChange={value => onUpdateRule({ daysBefore: Number(value) })}
          options={DAYS_BEFORE_OPTIONS}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <FormSelect
            label="ساعت ارسال"
            value={String(rule.hour)}
            onChange={value => onUpdateRule({ hour: Number(value) })}
            options={HOUR_OPTIONS}
          />
          <FormSelect
            label="دقیقه"
            value={String(rule.minute)}
            onChange={value => onUpdateRule({ minute: Number(value) })}
            options={MINUTE_OPTIONS}
          />
        </div>
      </div>

      {rule.enabled && (
        <Alert variant="info" style={{ marginTop: '0.75rem' }}>
          {previewLines.length ? (
            <>
              <p style={{ marginBottom: '0.5rem' }}>با تنظیم فعلی، این موارد یادآوری می‌شوند:</p>
              <ul style={{ margin: 0, paddingInlineStart: '1.1rem' }}>
                {previewLines.map(line => (
                  <li key={line} style={{ marginBottom: '0.25rem' }}>
                    {line}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ margin: 0 }}>{emptyPreviewMessages[kind]}</p>
          )}
        </Alert>
      )}

      <Button
        type="button"
        variant="primary"
        size="sm"
        style={{ marginTop: '0.75rem' }}
        onClick={onSave}
        disabled={saving}
      >
        {saving && <span className="spinner" />}
        ذخیره تنظیمات
      </Button>
    </Card>
  )
}
