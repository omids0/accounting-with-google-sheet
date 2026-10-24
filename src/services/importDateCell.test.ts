import { describe, expect, it } from 'vitest'

import { parseImportDate, parseImportDateTime } from './importDateCell'

describe('parseImportDate', () => {
  it.each([
    ['2026-10-20', '2026-10-20'],
    ['2026/10/20', '2026-10-20'],
    ['2026-10-20T10:30:00', '2026-10-20'],
    ['۲۰۲۶-۱۰-۲۰', '2026-10-20'],
    ['۱۴۰۵/۰۸/۰۲', '2026-10-24'],
    ['۱۴۰۵-۸-۲', '2026-10-24'],
    ['1405-08-02', '2026-10-24'],
    ['١٤٠٥/٠٨/٠٢', '2026-10-24']
  ])('reads «%s»', (raw, iso) => {
    expect(parseImportDate(raw)).toBe(iso)
  })

  it('reads a Sheets serial number', () => {
    expect(parseImportDate('46315')).toMatch(/^2026-\d{2}-\d{2}$/)
  })

  it.each([
    '',
    '   ',
    'not-a-date',
    '2026-13-01',
    '2026-02-30',
    '2026-00-10',
    '1405/07/31',
    '1405/13/01',
    '1405/01/32',
    '1100/01/01',
    '3000-01-01',
    '12',
    '10/05/2026',
    '2026-10-20T25:00:00x'
  ])('refuses «%s»', raw => {
    expect(parseImportDate(raw)).toBe('')
  })

  it('knows which Jalali years are leap', () => {
    expect(parseImportDate('1403/12/30')).not.toBe('')
    expect(parseImportDate('1404/12/30')).toBe('')
  })
})

describe('parseImportDateTime', () => {
  it.each([
    ['2026-10-20T08:05:09', '2026-10-20T08:05:09'],
    ['2026-10-20 8:05', '2026-10-20T08:05:00'],
    ['۱۴۰۵/۰۸/۰۲ ۰۹:۳۰', '2026-10-24T09:30:00'],
    ['2026-10-20', '2026-10-20T00:00:00']
  ])('reads «%s»', (raw, iso) => {
    expect(parseImportDateTime(raw)).toBe(iso)
  })

  it.each(['', 'soon', '2026-10-20 24:00', '2026-10-20 10:61', '2026-02-30 10:00', '1405/07/31'])(
    'refuses «%s»',
    raw => {
      expect(parseImportDateTime(raw)).toBe('')
    }
  )
})
