import { describe, expect, it } from 'vitest'

import { validateReceivablesCsvCells } from './receivablesCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', 'قرض', 'رضا', 'دوست', '۱٬۵۰۰٬۰۰۰ تومان', '۱۴۰۵/۰۸/۰۲']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateReceivablesCsvCells', () => {
  it('accepts a valid row and returns the amount and an ISO date', () => {
    expect(validateReceivablesCsvCells(row())).toEqual({
      title: 'قرض',
      debtor: 'رضا',
      category: 'دوست',
      amount: 1500000,
      borrowDate: '2026-10-24'
    })
  })

  it('reads an empty category as «سایر»', () => {
    expect(validateReceivablesCsvCells(row({ 4: '  ' })).category).toBe('سایر')
  })

  it.each([
    [2, '', 'عنوان خالی است'],
    [3, ' ', 'طرف حساب خالی است'],
    [5, 'abc', 'مبلغ عدد نیست'],
    [5, '0', 'مبلغ باید بیشتر از صفر باشد'],
    [5, '-3', 'مبلغ باید بیشتر از صفر باشد'],
    [6, '', 'تاریخ قرض خالی است'],
    [6, '1405/07/31', 'تاریخ قرض معتبر نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateReceivablesCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
