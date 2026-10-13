import { addDaysToIso } from './jalaliDate'

/** RFC 5545 line break. */
export const ICS_CRLF = '\r\n'

/** Longest content line in octets before it must be folded. */
const ICS_LINE_OCTETS = 75

export interface IcsAllDayEvent {
  /** Stable across exports, so a re-import updates the event instead of adding a copy. */
  uid: string
  /** `YYYY-MM-DD`. */
  date: string
  summary: string
  description?: string
  /** Display alarm this many days before the start; none when omitted. */
  alarmDaysBefore?: number
}

export interface IcsCalendarOptions {
  prodId: string
  /** Calendar name shown by apps that read `X-WR-CALNAME`. */
  name?: string
  /** `DTSTAMP` of every event. */
  now?: Date
}

/** TEXT value escaping: backslash, semicolon, comma and line breaks. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

const encoder = new TextEncoder()

function octets(text: string): number {
  return encoder.encode(text).length
}

/**
 * Folds a content line at 75 octets: each continuation line starts with one
 * space. Splits only between characters, never inside a UTF-8 sequence.
 */
export function foldIcsLine(line: string): string {
  if (octets(line) <= ICS_LINE_OCTETS) return line

  const parts: string[] = []
  let current = ''
  let size = 0
  // The leading space of a continuation line counts toward its 75 octets.
  let limit = ICS_LINE_OCTETS

  for (const char of line) {
    const charSize = octets(char)

    if (size + charSize > limit) {
      parts.push(current)
      current = ''
      size = 0
      limit = ICS_LINE_OCTETS - 1
    }
    current += char
    size += charSize
  }
  parts.push(current)

  return parts.join(`${ICS_CRLF} `)
}

/** `DTSTAMP` form: `20261013T083000Z` (UTC). */
export function formatIcsUtcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '')
}

/** `VALUE=DATE` form: `2026-10-27` → `20261027`. */
export function formatIcsDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '')
}

function eventLines(event: IcsAllDayEvent, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(event.date)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(addDaysToIso(event.date, 1))}`,
    `SUMMARY:${escapeIcsText(event.summary)}`
  ]

  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  lines.push('TRANSP:TRANSPARENT')

  if (event.alarmDaysBefore !== undefined) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(event.summary)}`,
      `TRIGGER:-P${Math.max(0, Math.round(event.alarmDaysBefore))}D`,
      'END:VALARM'
    )
  }
  lines.push('END:VEVENT')

  return lines
}

/** A whole VCALENDAR of all-day events: CRLF line endings, folded lines. */
export function buildIcsCalendar(
  events: IcsAllDayEvent[],
  { prodId, name, now = new Date() }: IcsCalendarOptions
): string {
  const stamp = formatIcsUtcStamp(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  if (name) lines.push(`X-WR-CALNAME:${escapeIcsText(name)}`)
  for (const event of events) lines.push(...eventLines(event, stamp))
  lines.push('END:VCALENDAR')

  return lines.map(foldIcsLine).join(ICS_CRLF) + ICS_CRLF
}
