import { describe, expect, it } from 'vitest'

import { validateWalletCsvCells } from './walletCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', 'ملی', '۱٬۲۰۰٬۰۰۰ تومان', '']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateWalletCsvCells', () => {
  it('accepts a valid row and reads the balance the way the app prints it', () => {
    expect(validateWalletCsvCells(row())).toEqual({ title: 'ملی', balance: 1200000 })
  })

  it('keeps a zero or negative balance', () => {
    expect(validateWalletCsvCells(row({ 3: '0' })).balance).toBe(0)
    expect(validateWalletCsvCells(row({ 3: '-500' })).balance).toBe(-500)
  })

  it.each([
    [2, ' ', 'عنوان خالی است'],
    [3, '', 'موجودی عدد نیست'],
    [3, 'خالی', 'موجودی عدد نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateWalletCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
