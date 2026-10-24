import { afterEach, describe, expect, it } from 'vitest'

import { formatJalaliMonthLabel } from './dateRange'
import { installDigitLocaleShim, setPersianDigitsEnabled } from './digitStyle'

describe('Jalali month label', () => {
  afterEach(() => setPersianDigitsEnabled(true))

  it('writes the year in Persian digits by default', () => {
    expect(formatJalaliMonthLabel('1405-07')).toBe('مهر ۱۴۰۵')
  })

  it('follows the Latin digits setting (the app installs the locale shim at start)', () => {
    setPersianDigitsEnabled(false)

    const uninstall = installDigitLocaleShim()

    try {
      expect(formatJalaliMonthLabel('1405-07')).toBe('مهر 1405')
    } finally {
      uninstall()
    }
  })

  it('returns an unknown key as it is', () => {
    expect(formatJalaliMonthLabel('nope')).toBe('nope')
  })
})
