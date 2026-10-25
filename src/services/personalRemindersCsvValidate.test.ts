import { describe, expect, it } from 'vitest'

import { validatePersonalReminderCsvCells } from './personalRemindersCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = [
    'x',
    '',
    'بیمه',
    'بیمه ماشین',
    '۱۴۰۵/۰۸/۰۲',
    'yearly',
    '۵٬۰۰۰٬۰۰۰ تومان',
    '۷',
    'TRUE'
  ]

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validatePersonalReminderCsvCells', () => {
  it('accepts a valid row and cleans the date, amount and days', () => {
    const cells = validatePersonalReminderCsvCells(row())

    expect(cells.slice(3, 9)).toEqual([
      'بیمه ماشین',
      '2026-10-24',
      'yearly',
      '5000000',
      '7',
      'TRUE'
    ])
  })

  it('lets the repeat, amount and days stay empty', () => {
    const cells = validatePersonalReminderCsvCells(row({ 5: '', 6: '', 7: '' }))

    expect(cells.slice(5, 8)).toEqual(['yearly', '0', '0'])
  })

  it.each([
    [3, ' ', 'عنوان خالی است'],
    [4, '', 'تاریخ خالی است'],
    [4, 'فردا', 'تاریخ معتبر نیست'],
    [5, 'weekly', 'تکرار نامعتبر است'],
    [6, 'ده', 'مبلغ عدد نیست'],
    [6, '-1', 'مبلغ نباید منفی باشد'],
    [7, '-2', 'روز قبل باید عدد صحیح بین ۰ تا ۳۶۵ باشد'],
    [7, '1.5', 'روز قبل باید عدد صحیح بین ۰ تا ۳۶۵ باشد'],
    [7, '400', 'روز قبل باید عدد صحیح بین ۰ تا ۳۶۵ باشد'],
    [7, 'x', 'روز قبل عدد نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validatePersonalReminderCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
