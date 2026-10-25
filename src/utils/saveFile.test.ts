import { describe, expect, it } from 'vitest'

import { exportFileName } from './saveFile'

const MEHR_20_1405 = new Date(2026, 9, 12, 12)

describe('exportFileName', () => {
  it('adds the time with a dash, never a colon, when asked', () => {
    expect(exportFileName('پشتیبان.zip', new Date(2026, 9, 12, 18, 5), true)).toBe(
      'پشتیبان ۱۴۰۵-۰۷-۲۰ ۱۸-۰۵.zip'
    )
    expect(exportFileName('پشتیبان.zip', new Date(2026, 9, 12, 18, 5))).toBe(
      'پشتیبان ۱۴۰۵-۰۷-۲۰.zip'
    )
  })

  it('puts the Jalali date in Persian digits before the extension', () => {
    expect(exportFileName('چک‌ها.csv', MEHR_20_1405)).toBe('چک‌ها ۱۴۰۵-۰۷-۲۰.csv')
    expect(exportFileName('اقساط.pdf', MEHR_20_1405)).toBe('اقساط ۱۴۰۵-۰۷-۲۰.pdf')
  })

  it('pads single-digit months and days', () => {
    expect(exportFileName('گزارش.csv', new Date(2026, 2, 21, 12))).toBe('گزارش ۱۴۰۵-۰۱-۰۱.csv')
  })

  it('appends the date when there is no extension', () => {
    expect(exportFileName('گزارش', MEHR_20_1405)).toBe('گزارش ۱۴۰۵-۰۷-۲۰')
  })

  it('replaces characters a file system would reject or treat as folders', () => {
    expect(exportFileName('گردش-ملت/پاسارگاد.csv', MEHR_20_1405)).toBe(
      'گردش-ملت-پاسارگاد ۱۴۰۵-۰۷-۲۰.csv'
    )
  })
})
