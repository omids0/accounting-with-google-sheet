import { describe, expect, it } from 'vitest'

import { validateTreasuryCsvCells } from './treasuryCsvValidate'

const known = new Set(['sekeb', 'my-fund'])

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', 'sekeb', 'buy', '۲', '۳٬۰۰۰٬۰۰۰ تومان', '۱۴۰۵/۰۸/۰۲', '']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateTreasuryCsvCells', () => {
  it('accepts a valid row and returns clean numbers and an ISO date', () => {
    expect(validateTreasuryCsvCells(row(), known)).toEqual({
      assetType: 'sekeb',
      action: 'buy',
      quantity: 2,
      unitPrice: 3000000,
      transactionDate: '2026-10-24'
    })
  })

  it('lets the unit price stay empty', () => {
    expect(validateTreasuryCsvCells(row({ 5: '' }), known).unitPrice).toBe(0)
  })

  it.each([
    [2, '', 'نوع دارایی خالی است'],
    [2, 'bitcoin', 'نوع دارایی در صندوقچه نیست'],
    [3, '', 'عملیات خالی است'],
    [3, 'hold', 'عملیات نامعتبر است'],
    [4, '', 'مقدار عدد نیست'],
    [4, 'x', 'مقدار عدد نیست'],
    [4, '0', 'مقدار باید بیشتر از صفر باشد'],
    [4, '-1', 'مقدار باید بیشتر از صفر باشد'],
    [5, 'گران', 'قیمت واحد عدد نیست'],
    [5, '-1', 'قیمت واحد نباید منفی باشد'],
    [6, '', 'تاریخ خالی است'],
    [6, '2026-13-01', 'تاریخ معتبر نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateTreasuryCsvCells(row({ [index]: value }), known)).toThrow(reason)
  })
})
