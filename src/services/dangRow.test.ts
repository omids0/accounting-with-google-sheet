import { describe, expect, it } from 'vitest'

import { isLegacyDangRow, rowToDang } from './dang'

const legacyRow = (amount: string) => [
  'd1',
  't',
  'شام',
  'رضا',
  amount,
  '1403/01/01',
  '',
  'TRUE',
  ''
]

const currentRow = (amount: string, counterparty = 'رضا') => [
  'd2',
  't',
  'شام',
  'رستوران',
  counterparty,
  amount,
  '1403/01/01',
  '',
  'FALSE',
  '',
  '',
  ''
]

describe('dang row layout', () => {
  it('keeps the historical layout for plain numbers', () => {
    expect(isLegacyDangRow(legacyRow('120000'))).toBe(true)
    expect(isLegacyDangRow(currentRow('120000'))).toBe(false)
    expect(rowToDang(legacyRow('120000'), 2).amount).toBe(120000)
    expect(rowToDang(currentRow('120000'), 2).amount).toBe(120000)
  })

  it('reads formatted and Persian-digit amounts', () => {
    expect(isLegacyDangRow(legacyRow('120,000'))).toBe(true)
    expect(rowToDang(legacyRow('120,000'), 2).amount).toBe(120000)
    expect(rowToDang(legacyRow('۱۲۰٬۰۰۰'), 2).counterparty).toBe('رضا')
    expect(rowToDang(currentRow('۱۲۰٬۰۰۰'), 2).amount).toBe(120000)
    expect(rowToDang(currentRow('1,200', '۱۲'), 2)).toMatchObject({
      counterparty: '۱۲',
      amount: 1200
    })
  })
})
