import { describe, expect, it } from 'vitest'

import { validateSavingsGoalCsvCells } from './savingsGoalsCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', 'سفر', '۱۰٬۰۰۰٬۰۰۰ تومان', '۱۴۰۵/۰۸/۰۲', 'acc', 'یادداشت', 'active']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateSavingsGoalCsvCells', () => {
  it('accepts a valid row and cleans the target and date', () => {
    expect(validateSavingsGoalCsvCells(row()).slice(2)).toEqual([
      'سفر',
      '10000000',
      '2026-10-24',
      'acc',
      'یادداشت',
      'active'
    ])
  })

  it('lets the date and the status stay empty', () => {
    const cells = validateSavingsGoalCsvCells(row({ 4: '', 7: '' }))

    expect([cells[4], cells[7]]).toEqual(['', 'active'])
  })

  it.each([
    [2, ' ', 'عنوان خالی است'],
    [3, '', 'مبلغ هدف عدد نیست'],
    [3, 'زیاد', 'مبلغ هدف عدد نیست'],
    [3, '0', 'مبلغ هدف باید بیشتر از صفر باشد'],
    [4, '1405/02/32', 'تاریخ هدف معتبر نیست'],
    [7, 'done', 'وضعیت نامعتبر است']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateSavingsGoalCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
