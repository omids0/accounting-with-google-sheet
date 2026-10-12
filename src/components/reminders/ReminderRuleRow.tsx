import type { ReactNode } from 'react'

import {
  DAYS_BEFORE_OPTIONS,
  formatReminderTime,
  parseReminderTime,
  reminderTimeOptions
} from './reminderConstants'
import { getReminderKindLabel } from '../../services/reminders'
import type { ReminderRule } from '../../types'
import { Select, ToggleSwitch } from '../form'
import {
  reminderRowClass,
  reminderRowExtraClass,
  reminderRowHintClass,
  reminderRowMainClass,
  reminderRowTextClass,
  reminderRowTimeClass
} from '../ui/reminderStyles'

interface ReminderRuleRowProps {
  rule: ReminderRule
  hint: ReactNode
  /** Due-date kinds also choose how many days before the due date. */
  withDaysBefore?: boolean
  busy: boolean
  onChange: (patch: Partial<ReminderRule>) => void
  /** Rendered under the row, e.g. the permission prompt. */
  children?: ReactNode
}

/** One reminder: label, time and an on/off switch that save at once. */
export default function ReminderRuleRow({
  rule,
  hint,
  withDaysBefore,
  busy,
  onChange,
  children
}: ReminderRuleRowProps) {
  const label = getReminderKindLabel(rule.kind)
  const time = formatReminderTime(rule.hour, rule.minute)

  return (
    <div className={reminderRowClass}>
      <div className={reminderRowMainClass}>
        <div className={reminderRowTextClass}>
          {label}
          <span className={reminderRowHintClass}>{hint}</span>
        </div>
        <Select
          className={reminderRowTimeClass}
          value={time}
          onChange={value => onChange(parseReminderTime(value))}
          options={reminderTimeOptions(time)}
          disabled={busy}
          aria-label={`ساعت ${label}`}
          compact
        />
        <ToggleSwitch
          checked={rule.enabled}
          onChange={enabled => onChange({ enabled })}
          label={label}
          disabled={busy}
        />
      </div>
      {withDaysBefore && rule.enabled && (
        <Select
          className={reminderRowExtraClass}
          value={String(rule.daysBefore)}
          onChange={value => onChange({ daysBefore: Number(value) })}
          options={DAYS_BEFORE_OPTIONS}
          disabled={busy}
          aria-label={`زمان یادآوری ${label} نسبت به موعد`}
          compact
        />
      )}
      {children}
    </div>
  )
}
