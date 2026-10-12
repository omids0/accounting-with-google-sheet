import type { SelectOption } from '../form'

export const DAYS_BEFORE_OPTIONS: SelectOption[] = [
  { value: '0', label: 'همان روز موعد' },
  { value: '1', label: '۱ روز قبل' },
  { value: '2', label: '۲ روز قبل' },
  { value: '3', label: '۳ روز قبل' },
  { value: '7', label: '۷ روز قبل' }
]

export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const HALF_HOUR_TIMES = Array.from({ length: 48 }, (_, index) =>
  formatReminderTime(Math.floor(index / 2), (index % 2) * 30)
)

/** Half-hour steps; a time saved by an older version (e.g. 09:15) stays selectable. */
export function reminderTimeOptions(current: string): SelectOption[] {
  const times = HALF_HOUR_TIMES.includes(current)
    ? HALF_HOUR_TIMES
    : [...HALF_HOUR_TIMES, current].sort()

  return times.map(time => ({ value: time, label: time }))
}

export function parseReminderTime(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(':').map(Number)

  return { hour: hour || 0, minute: minute || 0 }
}
