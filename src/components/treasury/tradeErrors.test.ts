import { describe, expect, it } from 'vitest'

import { tradeFormErrors } from './tradeErrors'

const messages = { price: 'قیمت واحد را وارد کنید', date: 'تاریخ الزامی است' }

describe('tradeFormErrors', () => {
  it('flags every empty field of a buy', () => {
    expect(
      tradeFormErrors({ quantity: '', unitPrice: '', transactionDate: '' }, 0, messages)
    ).toEqual({
      quantity: 'مقدار را وارد کنید',
      unitPrice: messages.price,
      transactionDate: messages.date
    })
  })

  it('names a quantity that needs more decimals than the asset allows', () => {
    const errors = tradeFormErrors(
      { quantity: 2.5, unitPrice: 10, transactionDate: '2026-01-01' },
      0,
      messages
    )

    expect(errors).toEqual({ quantity: 'مقدار باید عدد صحیح باشد' })
  })

  it('uses the sell wording for an empty quantity', () => {
    const errors = tradeFormErrors({ quantity: '', unitPrice: 5, transactionDate: 'x' }, 0, {
      ...messages,
      emptyQuantity: 'مقدار فروش را وارد کنید'
    })

    expect(errors.quantity).toBe('مقدار فروش را وارد کنید')
  })

  it('passes a complete trade', () => {
    expect(
      tradeFormErrors({ quantity: 3, unitPrice: 10, transactionDate: '2026-01-01' }, 0, messages)
    ).toEqual({})
  })
})
