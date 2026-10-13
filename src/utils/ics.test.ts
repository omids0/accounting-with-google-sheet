import { describe, expect, it } from 'vitest'

import {
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  formatIcsDate,
  formatIcsUtcStamp,
  ICS_CRLF
} from './ics'

const octets = (text: string) => new TextEncoder().encode(text).length

/** RFC 5545 unfolding: drop every CRLF followed by one space. */
const unfold = (text: string) => text.replace(/\r\n /g, '')

describe('escapeIcsText', () => {
  it('escapes backslashes, semicolons, commas and newlines', () => {
    expect(escapeIcsText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf')
  })

  it('leaves Persian punctuation alone', () => {
    expect(escapeIcsText('قسط ۳٬۰۰۰، تست')).toBe('قسط ۳٬۰۰۰، تست')
  })
})

describe('foldIcsLine', () => {
  it('keeps short lines as they are', () => {
    expect(foldIcsLine('SUMMARY:short')).toBe('SUMMARY:short')
  })

  it('folds at 75 octets without splitting a UTF-8 character', () => {
    const line = `SUMMARY:${'قسط وام مسکن '.repeat(12)}`
    const folded = foldIcsLine(line)
    const parts = folded.split(ICS_CRLF)

    expect(parts.length).toBeGreaterThan(1)
    for (const part of parts) expect(octets(part)).toBeLessThanOrEqual(75)
    for (const part of parts.slice(1)) expect(part.startsWith(' ')).toBe(true)
    expect(unfold(folded)).toBe(line)
    expect(folded).not.toContain('�')
  })

  it('folds a long ASCII line into 75 + 74 octet chunks', () => {
    const line = 'X'.repeat(200)
    const parts = foldIcsLine(line).split(ICS_CRLF)

    expect(parts[0]).toHaveLength(75)
    expect(parts[1]).toHaveLength(75)
    expect(unfold(parts.join(ICS_CRLF))).toBe(line)
  })
})

describe('ICS dates', () => {
  it('formats DTSTAMP in UTC', () => {
    expect(formatIcsUtcStamp(new Date('2026-10-13T08:30:05.123Z'))).toBe('20261013T083005Z')
  })

  it('formats all-day dates', () => {
    expect(formatIcsDate('2026-10-27')).toBe('20261027')
    expect(formatIcsDate('2026-10-27T10:00:00')).toBe('20261027')
  })
})

describe('buildIcsCalendar', () => {
  const now = new Date('2026-10-13T08:30:00Z')
  const content = buildIcsCalendar(
    [
      {
        uid: 'installment_p1-3@app',
        date: '2026-10-27',
        summary: 'قسط وام، مسکن; اول',
        description: 'line1\nline2',
        alarmDaysBefore: 1
      },
      { uid: 'checks_c1@app', date: '2027-03-20', summary: 'چک' }
    ],
    { prodId: '-//Test//FA', name: 'سررسیدها', now }
  )

  it('uses CRLF line endings only', () => {
    expect(content.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(content.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('writes one VEVENT per event with all-day dates and a stamp in UTC', () => {
    const text = unfold(content)

    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(text).toContain('DTSTART;VALUE=DATE:20261027\r\n')
    expect(text).toContain('DTEND;VALUE=DATE:20261028\r\n')
    expect(text).toContain('DTSTART;VALUE=DATE:20270320\r\n')
    expect(text.match(/DTSTAMP:20261013T083000Z/g)).toHaveLength(2)
  })

  it('escapes text values and adds the alarm only where asked', () => {
    const text = unfold(content)

    expect(text).toContain('SUMMARY:قسط وام، مسکن\\; اول\r\n')
    expect(text).toContain('DESCRIPTION:line1\\nline2\r\n')
    expect(text.match(/BEGIN:VALARM/g)).toHaveLength(1)
    expect(text).toContain('TRIGGER:-P1D\r\n')
    expect(text).toContain('UID:installment_p1-3@app\r\n')
  })

  it('folds every line to at most 75 octets', () => {
    for (const line of content.split(ICS_CRLF)) expect(octets(line)).toBeLessThanOrEqual(75)
  })
})
