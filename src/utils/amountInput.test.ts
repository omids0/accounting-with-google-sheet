import { describe, expect, it } from 'vitest'

import { MAX_AMOUNT, parseAmountInput } from './amountInput'

describe('parseAmountInput', () => {
  it.each([
    ['12345', '12345'],
    ['۱۲۳۴۵', '12345'],
    ['١٢٣٤٥', '12345'],
    ['1,234', '1234'],
    ['1٬234', '1234'],
    ['۱۲۳٬۴۵۶', '123456'],
    ['1,234,567', '1234567'],
    ['12abc34', '1234'],
    ['007', '7'],
    ['', '']
  ])('keeps the digits of %s', (raw, digits) => {
    expect(parseAmountInput(raw)).toEqual({ digits, cutDecimal: false, overMax: false })
  })

  it.each([
    ['12345678abc.5', '12345678'],
    ['12.5', '12'],
    ['12٫5', '12'],
    ['12,5', '12'],
    ['۱۲٫۵', '12'],
    ['1,2345', '1'],
    ['12.', '12'],
    ['۱۲۳٬۴۵۶,', '123456']
  ])('drops the decimal part of %s instead of merging it', (raw, digits) => {
    expect(parseAmountInput(raw)).toEqual({ digits, cutDecimal: true, overMax: false })
  })

  it('flags an amount past the maximum', () => {
    expect(parseAmountInput(String(MAX_AMOUNT)).overMax).toBe(false)
    expect(parseAmountInput(String(MAX_AMOUNT + 1)).overMax).toBe(true)
    expect(parseAmountInput('1'.repeat(25)).overMax).toBe(true)
  })
})

describe('parseAmountInput with the text the field showed before', () => {
  it('does not take the field’s own grouping mark for a decimal point', () => {
    expect(parseAmountInput('۱٬۲۳۴۵', { previous: '۱٬۲۳۴' })).toEqual({
      digits: '12345',
      cutDecimal: false,
      overMax: false
    })
    expect(parseAmountInput('1,2345', { previous: '1,234' }).digits).toBe('12345')
  })

  it('still reads a mark the user added as a decimal point', () => {
    expect(parseAmountInput('۱٬۲۳۴,', { previous: '۱٬۲۳۴' })).toMatchObject({
      digits: '1234',
      cutDecimal: true
    })
    expect(parseAmountInput('12٫', { previous: '۱۲' }).cutDecimal).toBe(true)
  })
})
