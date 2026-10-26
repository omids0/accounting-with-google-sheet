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

describe('the payments cell (index 13)', () => {
  const cells = (payments: string | undefined) => {
    const base = row()

    base[13] = payments as string

    return base
  }

  it('is optional: old files without it, and an empty cell, pass', () => {
    expect(() => validateDangCsvCells(row())).not.toThrow()
    expect(() => validateDangCsvCells(cells(''))).not.toThrow()
    expect(() => validateDangCsvCells(cells('[]'))).not.toThrow()
  })

  it('accepts payments that add up to no more than the debt', () => {
    const json = JSON.stringify([
      { id: 'a', amount: 150000 },
      { id: 'b', amount: 50000 }
    ])

    expect(() => validateDangCsvCells(cells(json))).not.toThrow()
  })

  it.each([
    ['not json', 'معتبر نیست'],
    ['{"amount":5}', 'معتبر نیست'],
    ['[{"amount":0}]', 'باید بیشتر از صفر باشد'],
    ['[{"amount":-5}]', 'باید بیشتر از صفر باشد'],
    ['[{"id":"x"}]', 'باید بیشتر از صفر باشد'],
    ['[{"amount":150000},{"amount":50001}]', 'از مبلغ بدهی بیشتر است']
  ])('rejects «%s»', (value, reason) => {
    expect(() => validateDangCsvCells(cells(value))).toThrow(reason)
  })
})
