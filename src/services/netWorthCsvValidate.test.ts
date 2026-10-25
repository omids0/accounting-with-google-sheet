import { describe, expect, it } from 'vitest'

import { validateNetWorthCsvCells } from './netWorthCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['۱۴۰۵-۷', '۵٬۰۰۰', '۸٬۰۰۰', '۳٬۰۰۰', 'دیروز', 'manual']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateNetWorthCsvCells', () => {
  it('accepts a valid row, writing the month key and numbers the way the sheet keeps them', () => {
    expect(validateNetWorthCsvCells(row())).toEqual([
      '1405-07',
      '5000',
      '8000',
      '3000',
      'دیروز',
      'manual'
    ])
  })

  it('keeps a negative net worth', () => {
    expect(validateNetWorthCsvCells(row({ 1: '-200' }))[1]).toBe('-200')
  })

  it('lets assets, liabilities and the source stay empty', () => {
    const cells = validateNetWorthCsvCells(row({ 2: '', 3: '', 5: '' }))

    expect(cells.slice(2)).toEqual(['0', '0', 'دیروز', 'auto'])
  })

  it.each([
    [0, '', 'کلید ماه معتبر نیست'],
    [0, '1405-13', 'کلید ماه معتبر نیست'],
    [0, 'مهر', 'کلید ماه معتبر نیست'],
    [1, '', 'دارایی خالص عدد نیست'],
    [1, 'x', 'دارایی خالص عدد نیست'],
    [2, 'x', 'دارایی‌ها عدد نیست'],
    [3, 'x', 'بدهی‌ها عدد نیست'],
    [5, 'guess', 'منبع نامعتبر است']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateNetWorthCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
