import { describe, expect, it } from 'vitest'

import { validateCounterpartyCsvCells } from './counterpartiesCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', 'علی', 'رضایی', '۱۳۷۰/۰۵/۱۰', 'تهران', '', '09120000000', '[]', '']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateCounterpartyCsvCells', () => {
  it('accepts a valid row and turns the Jalali birth date into ISO', () => {
    const cells = validateCounterpartyCsvCells(row())

    expect(cells.slice(2, 5)).toEqual(['علی', 'رضایی', '1991-08-01'])
    expect(cells[7]).toBe('09120000000')
  })

  it('lets the birth date and the accounts stay empty', () => {
    const cells = validateCounterpartyCsvCells(row({ 4: '', 8: '' }))

    expect(cells[4]).toBe('')
  })

  it('accepts a list of accounts', () => {
    expect(() =>
      validateCounterpartyCsvCells(row({ 8: '[{"bankName":"ملی","accountNumber":"1"}]' }))
    ).not.toThrow()
  })

  it.each([
    [2, ' ', 'نام خالی است'],
    [3, '', 'نام خانوادگی خالی است'],
    [4, '31/31/31', 'تاریخ تولد معتبر نیست'],
    [4, '1370/07/31', 'تاریخ تولد معتبر نیست'],
    [8, 'ملی 123', 'حساب‌ها معتبر نیست'],
    [8, '{"a":1}', 'حساب‌ها معتبر نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateCounterpartyCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
