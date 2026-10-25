import { describe, expect, it } from 'vitest'

import { validateChecksCsvCells } from './checksCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', '55', 'علی', '100', '2026-10-01', '2026-10-20']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateChecksCsvCells', () => {
  it('accepts a valid row and returns ISO dates', () => {
    expect(validateChecksCsvCells(row())).toEqual({
      counterparty: 'علی',
      amount: 100,
      creationDate: '2026-10-01',
      dueDate: '2026-10-20'
    })
  })

  it('reads the amount the way the app prints it', () => {
    expect(validateChecksCsvCells(row({ 4: '۲٬۵۰۰ تومان' })).amount).toBe(2500)
    expect(validateChecksCsvCells(row({ 4: '2,500 ریال' })).amount).toBe(2500)
    expect(validateChecksCsvCells(row({ 4: '٣٬٠٠٠' })).amount).toBe(3000)
  })

  it('rejects a missing counterparty', () => {
    expect(() => validateChecksCsvCells(row({ 3: '  ' }))).toThrow('طرف حساب خالی است')
  })

  it.each(['abc', '', 'تومان'])('rejects the non-numeric amount «%s»', amount => {
    expect(() => validateChecksCsvCells(row({ 4: amount }))).toThrow('مبلغ عدد نیست')
  })

  it.each(['0', '-5'])('rejects the amount «%s»', amount => {
    expect(() => validateChecksCsvCells(row({ 4: amount }))).toThrow('مبلغ باید بیشتر از صفر باشد')
  })

  it('rejects unparseable dates', () => {
    expect(() => validateChecksCsvCells(row({ 5: 'not-a-date' }))).toThrow('تاریخ صدور معتبر نیست')
    expect(() => validateChecksCsvCells(row({ 6: 'not-a-date' }))).toThrow(
      'تاریخ سررسید معتبر نیست'
    )
    expect(() => validateChecksCsvCells(row({ 6: '' }))).toThrow('تاریخ سررسید خالی است')
  })

  it('reads Jalali dates in either form and refuses a day the month lacks', () => {
    const jalali = validateChecksCsvCells(row({ 5: '۱۴۰۵-۸-۱', 6: '1405/08/02' }))

    expect([jalali.creationDate, jalali.dueDate]).toEqual(['2026-10-23', '2026-10-24'])
    expect(() => validateChecksCsvCells(row({ 6: '1405/07/31' }))).toThrow(
      'تاریخ سررسید معتبر نیست'
    )
  })

  it('lets the issue date stay empty', () => {
    expect(validateChecksCsvCells(row({ 5: '' })).creationDate).toBe('')
  })
})
