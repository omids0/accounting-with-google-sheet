import { describe, expect, it } from 'vitest'

import { validateVaultAssetCsvCells } from './treasuryCatalogCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', 'gold', 'XAU', 'طلای ۱۸', 'گرم', '۳', 'manual', '', '۳٬۰۰۰٬۰۰۰', '', 'بله']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateVaultAssetCsvCells', () => {
  it('accepts a valid row and cleans the decimals and price', () => {
    const cells = validateVaultAssetCsvCells(row())

    expect([cells[3], cells[5], cells[8]]).toEqual(['طلای ۱۸', '3', '3000000'])
  })

  it('accepts the Persian class label and leaves empty cells empty', () => {
    const cells = validateVaultAssetCsvCells(row({ 1: 'طلا', 5: '', 6: '', 8: '' }))

    expect([cells[1], cells[5], cells[6], cells[8]]).toEqual(['طلا', '', '', ''])
  })

  it.each([
    [1, 'metal', 'کلاس دارایی نامعتبر است'],
    [3, ' ', 'نام خالی است'],
    [5, 'x', 'اعشار عدد نیست'],
    [5, '9', 'اعشار باید عدد صحیح بین ۰ تا ۸ باشد'],
    [5, '1.5', 'اعشار باید عدد صحیح بین ۰ تا ۸ باشد'],
    [6, 'auto', 'منبع قیمت نامعتبر است'],
    [8, 'ارزان', 'قیمت دستی عدد نیست'],
    [8, '-4', 'قیمت دستی نباید منفی باشد']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateVaultAssetCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
