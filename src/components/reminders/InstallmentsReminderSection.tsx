import { DAYS_BEFORE_OPTIONS, HOUR_OPTIONS, MINUTE_OPTIONS } from './reminderConstants'
import { getReminderKindLabel } from '../../services/reminders'
import type { ReminderRule } from '../../types'
import { FormSelect } from '../form'

interface InstallmentsReminderSectionProps {
  installmentsRule: ReminderRule
  previewLines: string[]
  saving: boolean
  onUpdateRule: (patch: Partial<ReminderRule>) => void
  onSave: () => void
}

export default function InstallmentsReminderSection({
  installmentsRule,
  previewLines,
  saving,
  onUpdateRule,
  onSave
}: InstallmentsReminderSectionProps) {
  return (
    <div className="card">
      <h2 className="card-title">{getReminderKindLabel('installments')}</h2>
      <label
        className="checkbox-row"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <input
          type="checkbox"
          checked={installmentsRule.enabled}
          onChange={e => onUpdateRule({ enabled: e.target.checked })}
        />
        <span>یادآوری اقساط پرداخت‌نشده</span>
      </label>

      <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <FormSelect
          label="چند روز قبل از موعد؟"
          value={String(installmentsRule.daysBefore)}
          onChange={value => onUpdateRule({ daysBefore: Number(value) })}
          options={DAYS_BEFORE_OPTIONS}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <FormSelect
            label="ساعت ارسال"
            value={String(installmentsRule.hour)}
            onChange={value => onUpdateRule({ hour: Number(value) })}
            options={HOUR_OPTIONS}
          />
          <FormSelect
            label="دقیقه"
            value={String(installmentsRule.minute)}
            onChange={value => onUpdateRule({ minute: Number(value) })}
            options={MINUTE_OPTIONS}
          />
        </div>
      </div>

      {installmentsRule.enabled && (
        <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
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
            <p style={{ margin: 0 }}>فعلاً قسط پرداخت‌نشده‌ای برای این بازه پیدا نشد.</p>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-sm"
        style={{ marginTop: '0.75rem' }}
        onClick={onSave}
        disabled={saving}
      >
        {saving && <span className="spinner" />}
        ذخیره تنظیمات
      </button>
    </div>
  )
}
