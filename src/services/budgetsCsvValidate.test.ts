import { describe, expect, it } from 'vitest'

import { validateBudgetCsvCells } from './budgetsCsvValidate'

describe('validateBudgetCsvCells', () => {
  it('accepts a valid row and cleans the amount', () => {
    expect(validateBudgetCsvCells([' خوراک ', '۳٬۰۰۰٬۰۰۰ تومان', 'دیروز'])).toEqual([
      'خوراک',
      '3000000',
      'دیروز'
    ])
  })

  it.each([
    [['', '100'], 'دسته خالی است'],
    [['خوراک', ''], 'مبلغ ماهانه عدد نیست'],
    [['خوراک', 'زیاد'], 'مبلغ ماهانه عدد نیست'],
    [['خوراک', '0'], 'مبلغ ماهانه باید بیشتر از صفر باشد'],
    [['خوراک', '-5'], 'مبلغ ماهانه باید بیشتر از صفر باشد']
  ])('rejects %j with «%s»', (cells, reason) => {
    expect(() => validateBudgetCsvCells(cells)).toThrow(reason)
  })
})
