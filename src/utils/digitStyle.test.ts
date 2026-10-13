import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { formatCalendarDateNumeric } from './dateConverter'
import {
  installDigitLocaleShim,
  LATIN_DIGITS_KEY,
  numberLocale,
  persianDigitsEnabled,
  resetDigitStyleCache,
  setPersianDigitsEnabled
} from './digitStyle'
import { formatMoney, formatPersianNumber, formatSignedNumber } from './formatMoney'
import { toPersianDigits } from './normalizeDigits'
import { parseNumeric } from './parseNumeric'

describe('«ارقام فارسی» flag', () => {
  let uninstall: () => void = () => undefined

  beforeEach(() => {
    localStorage.clear()
    resetDigitStyleCache()
  })

  afterEach(() => {
    uninstall()
    uninstall = () => undefined
    setPersianDigitsEnabled(true)
  })

  it('is on by default: today’s Persian digits', () => {
    expect(persianDigitsEnabled()).toBe(true)
    expect(numberLocale()).toBe('fa-IR')
    expect(toPersianDigits('2.0.1')).toBe('۲.۰.۱')
    expect(formatPersianNumber(1_234_567)).toBe('۱٬۲۳۴٬۵۶۷')
  })

  it('is stored per device and only while off', () => {
    setPersianDigitsEnabled(false)
    expect(localStorage.getItem(LATIN_DIGITS_KEY)).toBe('1')
    setPersianDigitsEnabled(true)
    expect(localStorage.getItem(LATIN_DIGITS_KEY)).toBeNull()
  })

  it('switches toPersianDigits and the number formatters to Latin digits', () => {
    setPersianDigitsEnabled(false)

    expect(toPersianDigits('2.0.1')).toBe('2.0.1')
    expect(toPersianDigits('۱۲')).toBe('12')
    expect(formatPersianNumber(1_234_567)).toBe('1,234,567')
    expect(formatSignedNumber(-2_400_000)).toContain('−2,400,000')
    expect(formatMoney(5000, 'toman')).toBe('5,000 تومان')
    expect(formatCalendarDateNumeric('2025-03-21', 'shamsi')).toBe('1404/01/01')
  })

  it('keeps Latin output parseable', () => {
    setPersianDigitsEnabled(false)
    expect(parseNumeric(formatPersianNumber(1_234_567.5))).toBe(1_234_567.5)
  })

  it('reads the stored flag on a fresh launch', () => {
    localStorage.setItem(LATIN_DIGITS_KEY, '1')
    resetDigitStyleCache()
    expect(persianDigitsEnabled()).toBe(false)
    expect(numberLocale()).toBe('fa-IR-u-nu-latn')
  })

  it('routes direct toLocaleString("fa-IR") calls only when Latin digits are on', () => {
    expect(installDigitLocaleShim()).toBeTypeOf('function')
    expect((12).toLocaleString('fa-IR')).toBe('۱۲')

    setPersianDigitsEnabled(false)
    uninstall = installDigitLocaleShim()

    expect((1234).toLocaleString('fa-IR')).toBe('1,234')
    expect(new Date(Date.UTC(2025, 2, 21, 12)).toLocaleDateString('fa-IR')).toMatch(/^1404/)
    // Every other locale passes through untouched.
    expect((1234).toLocaleString('ar-EG')).toBe((1234).toLocaleString('ar-EG-u-nu-arab'))
  })
})
