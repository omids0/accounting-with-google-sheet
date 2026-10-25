import { describe, expect, it } from 'vitest'

import { validateInstallmentsCsvCells } from './installmentsCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = ['x', '', 'وام', '۲٬۵۰۰ تومان', '12', '5', '۱۴۰۵/۰۸/۰۲']

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateInstallmentsCsvCells', () => {
  it('accepts a valid row, reading the amount and the Jalali start date', () => {
    expect(validateInstallmentsCsvCells(row())).toEqual({
      title: 'وام',
      amount: 2500,
      count: 12,
      dueDay: 5,
      startDate: '2026-10-24'
    })
  })

  it('reads Persian digits in the counts', () => {
    const valid = validateInstallmentsCsvCells(row({ 4: '۳۰۰', 5: '۳۱' }))

    expect([valid.count, valid.dueDay]).toEqual([300, 31])
  })

  it.each([
    [2, ' ', 'عنوان خالی است'],
    [3, 'abc', 'مبلغ قسط عدد نیست'],
    [3, '', 'مبلغ قسط عدد نیست'],
    [3, '0', 'مبلغ قسط باید بیشتر از صفر باشد'],
    [3, '-100', 'مبلغ قسط باید بیشتر از صفر باشد'],
    [4, 'x', 'تعداد بازپرداخت عدد نیست'],
    [4, '0', 'تعداد بازپرداخت باید عدد صحیح بین ۱ تا ۳۰۰ باشد'],
    [4, '301', 'تعداد بازپرداخت باید عدد صحیح بین ۱ تا ۳۰۰ باشد'],
    [4, '2.5', 'تعداد بازپرداخت باید عدد صحیح بین ۱ تا ۳۰۰ باشد'],
    [5, '0', 'موعد در ماه باید عدد صحیح بین ۱ تا ۳۱ باشد'],
    [5, '32', 'موعد در ماه باید عدد صحیح بین ۱ تا ۳۱ باشد'],
    [5, '', 'موعد در ماه عدد نیست'],
    [6, '', 'تاریخ شروع خالی است'],
    [6, '۱۴۰۵/۱۳/۰۱', 'تاریخ شروع معتبر نیست']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateInstallmentsCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
