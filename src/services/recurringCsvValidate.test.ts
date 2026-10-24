import { describe, expect, it } from 'vitest'

import { validateRecurringCsvCells } from './recurringCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = [
    'x',
    '',
    'expense',
    'قبض',
    '',
    'acc',
    '۲٬۰۰۰ تومان',
    'برق',
    '۱۵',
    'auto',
    '۱۴۰۵-۷',
    'بله'
  ]

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateRecurringCsvCells', () => {
  it('accepts a valid row and cleans the amount, day and month', () => {
    const cells = validateRecurringCsvCells(row())

    expect(cells.slice(2, 12)).toEqual([
      'expense',
      'قبض',
      '',
      'acc',
      '2000',
      'برق',
      '15',
      'auto',
      '1405-07',
      'بله'
    ])
  })

  it('lets the mode and the last month stay empty', () => {
    const cells = validateRecurringCsvCells(row({ 9: '', 10: '' }))

    expect([cells[9], cells[10]]).toEqual(['reminder', ''])
  })

  it.each([
    [2, '', 'نوع خالی است'],
    [2, 'savings', 'نوع نامعتبر است'],
    [6, 'abc', 'مبلغ عدد نیست'],
    [6, '0', 'مبلغ باید بیشتر از صفر باشد'],
    [8, '0', 'روز ماه باید عدد صحیح بین ۱ تا ۳۱ باشد'],
    [8, '32', 'روز ماه باید عدد صحیح بین ۱ تا ۳۱ باشد'],
    [8, '', 'روز ماه عدد نیست'],
    [9, 'manual', 'حالت نامعتبر است'],
    [10, '1405-13', 'ماه آخرین ثبت معتبر نیست'],
    [10, 'مهر', 'ماه آخرین ثبت معتبر نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateRecurringCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
