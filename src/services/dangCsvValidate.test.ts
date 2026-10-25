import { describe, expect, it } from 'vitest'

import { validateDangCsvCells } from './dangCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', 'شام', 'خوراک', 'علی', '٢٠٠٬٠٠٠', '2026-10-20']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateDangCsvCells', () => {
  it('accepts a valid row, reading Arabic digits', () => {
    expect(validateDangCsvCells(row())).toEqual({
      title: 'شام',
      category: 'خوراک',
      counterparty: 'علی',
      amount: 200000,
      date: '2026-10-20'
    })
  })

  it('reads an empty category as «سایر»', () => {
    expect(validateDangCsvCells(row({ 3: '' })).category).toBe('سایر')
  })

  it.each([
    [2, '', 'عنوان خالی است'],
    [4, ' ', 'طرف حساب خالی است'],
    [5, '', 'مبلغ عدد نیست'],
    [5, 'ریال', 'مبلغ عدد نیست'],
    [5, '0', 'مبلغ باید بیشتر از صفر باشد'],
    [6, '', 'تاریخ خالی است'],
    [6, '2026-02-30', 'تاریخ معتبر نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateDangCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
