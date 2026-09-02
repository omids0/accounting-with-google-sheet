import { formatIsoDatePersian, jalaliToIso, toIsoDate } from './jalaliDate'
import { normalizeDigits } from './normalizeDigits'

function formatDateToDateTimeIso(date: Date): string {
  const y = date.getFullYear()

  const m = String(date.getMonth() + 1).padStart(2, '0')

  const d = String(date.getDate()).padStart(2, '0')

  const h = String(date.getHours()).padStart(2, '0')

  const min = String(date.getMinutes()).padStart(2, '0')

  const sec = String(date.getSeconds()).padStart(2, '0')

  return `${y}-${m}-${d}T${h}:${min}:${sec}`
}

function sheetsSerialToDateTimeIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null

  const date = new Date((serial - 25569) * 86400000)

  if (Number.isNaN(date.getTime())) return null

  return formatDateToDateTimeIso(date)
}

/** Normalize sheet / user datetime values to `YYYY-MM-DDTHH:mm:ss`. */
export function normalizeDateTimeIso(value: unknown): string {
  if (value == null || value === '') return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    return sheetsSerialToDateTimeIso(value) ?? ''
  }

  const text = normalizeDigits(String(value).trim())

  if (!text) return ''

  const canonical = text.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (canonical) {
    const [, date, hour, minute, second = '00'] = canonical

    return `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`
  }

  const spaced = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (spaced) {
    const [, date, hour, minute, second = '00'] = spaced

    return `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T00:00:00`
  }

  const jalali = text.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  )

  if (jalali) {
    const [, jy, jm, jd, hour = '0', minute = '0', second = '0'] = jalali

    const dateIso = jalaliToIso(Number(jy), Number(jm), Number(jd))

    return `${dateIso}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(
      2,
      '0'
    )}`
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    return sheetsSerialToDateTimeIso(Number(text)) ?? ''
  }

  const parsed = new Date(text)

  if (!Number.isNaN(parsed.getTime())) {
    return formatDateToDateTimeIso(parsed)
  }

  return ''
}

export function toDateTimeIso(dateIso: string, hour: number, minute: number): string {
  const date = dateIso.slice(0, 10)

  const h = String(hour).padStart(2, '0')

  const m = String(minute).padStart(2, '0')

  return `${date}T${h}:${m}:00`
}

export function fromDateTimeIso(iso: string): {
  dateIso: string
  hour: number
  minute: number
} {
  const normalized = normalizeDateTimeIso(iso)

  if (!normalized) {
    const now = new Date()

    return {
      dateIso: toIsoDate(now),
      hour: now.getHours(),
      minute: now.getMinutes()
    }
  }

  const [datePart, timePart = '00:00:00'] = normalized.split('T')

  const [hourRaw, minuteRaw] = timePart.split(':')

  return {
    dateIso: datePart,
    hour: Number(hourRaw) || 0,
    minute: Number(minuteRaw) || 0
  }
}

export function parseDateTime(iso: string): Date {
  const normalized = normalizeDateTimeIso(iso)

  if (!normalized) return new Date(NaN)

  return new Date(normalized)
}

export function calcDurationMinutes(startAt: string, endAt: string): number {
  const start = parseDateTime(startAt)

  const end = parseDateTime(endAt)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0
  }

  return Math.round((end.getTime() - start.getTime()) / 60000)
}

export function formatDurationFa(minutes: number): string {
  if (minutes <= 0) return '۰'

  const hours = Math.floor(minutes / 60)

  const mins = minutes % 60

  const parts: string[] = []

  if (hours > 0) parts.push(`${hours.toLocaleString('fa-IR')} ساعت`)
  if (mins > 0) parts.push(`${mins.toLocaleString('fa-IR')} دقیقه`)

  return parts.join(' و ') || '۰'
}

/** Decimal hours as shown in Jira timesheets (e.g. 121.2 = 121h 12m). */
export function formatJiraTimesheetHours(minutes: number): string {
  if (minutes <= 0) return '0'

  return (minutes / 60).toFixed(1)
}

export function formatDateTimePersian(iso: string): string {
  if (!iso) return '—'

  const { dateIso, hour, minute } = fromDateTimeIso(iso)

  const dateLabel = formatIsoDatePersian(dateIso)

  const timeLabel = `${hour.toLocaleString('fa-IR', { useGrouping: false })}:${String(
    minute
  ).padStart(2, '0')}`

  return `${dateLabel}، ${timeLabel}`
}

export function addMinutesToDateTime(iso: string, minutes: number): string {
  const date = parseDateTime(iso)

  if (Number.isNaN(date.getTime())) return iso
  date.setMinutes(date.getMinutes() + minutes)

  const y = date.getFullYear()

  const m = String(date.getMonth() + 1).padStart(2, '0')

  const d = String(date.getDate()).padStart(2, '0')

  const h = String(date.getHours()).padStart(2, '0')

  const min = String(date.getMinutes()).padStart(2, '0')

  return `${y}-${m}-${d}T${h}:${min}:00`
}

export function syncEndDateTimeFromStart(
  startAt: string,
  endAt: string,
  previousStartAt?: string
): string {
  const normalizedStart = normalizeDateTimeIso(startAt)

  const normalizedEnd = normalizeDateTimeIso(endAt)

  if (!normalizedStart) return endAt
  if (!normalizedEnd) return addMinutesToDateTime(normalizedStart, 60)

  const startParts = fromDateTimeIso(normalizedStart)

  const endParts = fromDateTimeIso(normalizedEnd)

  const previousStartParts = previousStartAt ? fromDateTimeIso(previousStartAt) : null

  let nextEnd = normalizedEnd

  const startDateChanged = Boolean(
    previousStartParts && startParts.dateIso !== previousStartParts.dateIso
  )

  const endWasAlignedToStart =
    !previousStartParts || endParts.dateIso === previousStartParts.dateIso

  if (startDateChanged || endWasAlignedToStart) {
    nextEnd = toDateTimeIso(startParts.dateIso, endParts.hour, endParts.minute)
  }

  if (parseDateTime(nextEnd) <= parseDateTime(normalizedStart)) {
    nextEnd = addMinutesToDateTime(normalizedStart, 60)
  }

  return clampDateTimeToMin(nextEnd, normalizedStart)
}

export function clampDateTimeToMin(value: string, minDateTime: string): string {
  if (!minDateTime) return value
  if (parseDateTime(value) < parseDateTime(minDateTime)) {
    return minDateTime
  }

  return value
}

export function getNowDateTimeIso(): string {
  const now = new Date()

  const y = now.getFullYear()

  const m = String(now.getMonth() + 1).padStart(2, '0')

  const d = String(now.getDate()).padStart(2, '0')

  const h = String(now.getHours()).padStart(2, '0')

  const min = String(now.getMinutes()).padStart(2, '0')

  return `${y}-${m}-${d}T${h}:${min}:00`
}
