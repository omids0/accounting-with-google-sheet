import { jalaliToIso, toIsoDate } from './jalaliDate'
import { normalizeDigits } from './normalizeDigits'
import { parseNumericStrict } from './parseNumeric'

function parseJalaliDateString(text: string): string | null {
  const normalized = normalizeDigits(text.trim())

  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)

  if (!match) return null

  const year = Number(match[1])

  const month = Number(match[2])

  const day = Number(match[3])

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null

  return jalaliToIso(year, month, day)
}

function sheetsSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null

  const utcDays = Math.floor(serial - 25569)

  const date = new Date(utcDays * 86400000)

  if (Number.isNaN(date.getTime())) return null

  return toIsoDate(date)
}

export function cellToString(value: unknown): string {
  if (value == null) return ''

  return String(value)
}

export function normalizeSheetDate(value: unknown): string {
  if (value == null || value === '') return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    return sheetsSerialToIso(value) ?? ''
  }

  const text = String(value).trim()

  if (!text) return ''

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10)
  }

  const jalali = parseJalaliDateString(text)

  if (jalali) return jalali

  const asciiDigits = normalizeDigits(text)

  if (/^\d+(\.\d+)?$/.test(asciiDigits)) {
    const serial = Number(asciiDigits)

    const fromSerial = sheetsSerialToIso(serial)

    if (fromSerial) return fromSerial
  }

  const parsed = new Date(text)

  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed)
  }

  return ''
}

export function isSheetHeaderRow(row: unknown[]): boolean {
  const first = cellToString(row[0]).normalize('NFC').trim()

  return first === 'شناسه'
}

/** The historical `Number()`-based numeric check — kept so existing layout detection is unchanged. */
export function isPlainNumberCell(value: unknown): boolean {
  return value != null && value !== '' && !Number.isNaN(Number(value))
}

/** Numeric check that also accepts thousands separators, Persian/Arabic digits and «٫». */
export function isNumericCell(value: unknown): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') return false

  return String(value).trim() !== '' && parseNumericStrict(value) !== null
}

/** A payments-style JSON array cell, or an empty one. */
export function isJsonArrayCell(value: unknown): boolean {
  const text = cellToString(value).trim()

  return text === '' || text.startsWith('[')
}
