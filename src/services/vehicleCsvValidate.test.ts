import { describe, expect, it } from 'vitest'

import { validateVehicleCsvCells } from './vehicleCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = [
    'x',
    '',
    'پژو',
    '۱۲۰٬۰۰۰',
    'VIN1',
    '۱۴۰۰',
    '۵ نفر',
    '12ب34567',
    'yearly',
    '۱۴۰۵/۰۸/۰۲',
    'TRUE',
    ''
  ]

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateVehicleCsvCells', () => {
  it('accepts a valid row and cleans the mileage, year and date', () => {
    const cells = validateVehicleCsvCells(row())

    expect([cells[2], cells[3], cells[5], cells[8], cells[9]]).toEqual([
      'پژو',
      '120000',
      '1400',
      'yearly',
      '2026-10-24'
    ])
  })

  it('lets the year, reminder and last update stay empty, and takes a Gregorian year', () => {
    const empty = validateVehicleCsvCells(row({ 5: '', 8: '', 9: '' }))

    expect([empty[5], empty[8], empty[9]]).toEqual(['', '', ''])
    expect(validateVehicleCsvCells(row({ 5: '2021' }))[5]).toBe('2021')
  })

  it.each([
    [2, ' ', 'عنوان خالی است'],
    [3, '', 'کارکرد عدد نیست'],
    [3, 'زیاد', 'کارکرد عدد نیست'],
    [3, '-5', 'کارکرد نباید منفی باشد'],
    [5, '1700', 'سال ساخت معتبر نیست'],
    [5, '14.5', 'سال ساخت معتبر نیست'],
    [5, 'قدیمی', 'سال ساخت عدد نیست'],
    [8, 'monthly', 'یادآوری کارکرد نامعتبر است'],
    [9, '1405/02/32', 'آخرین بروز کارکرد معتبر نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateVehicleCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
