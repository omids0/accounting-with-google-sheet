import { describe, expect, it } from 'vitest'

import {
  INVALID_AMOUNT_MESSAGE,
  NON_POSITIVE_AMOUNT_MESSAGE,
  requiredNonNegativeAmount,
  requiredPositiveAmount,
  requiredPositiveInteger,
  validatePositiveAmount
} from './formValidation'

describe('validatePositiveAmount', () => {
  it('accepts positive amounts in any digit form', () => {
    expect(validatePositiveAmount(1500)).toBe(true)
    expect(validatePositiveAmount('1,500')).toBe(true)
    expect(validatePositiveAmount('۱۵۰۰')).toBe(true)
  })

  it('rejects empty values with the empty message', () => {
    expect(validatePositiveAmount('')).toBe('مبلغ را وارد کنید')
    expect(validatePositiveAmount(undefined, 'مبلغ قسط را وارد کنید')).toBe('مبلغ قسط را وارد کنید')
  })

  it('rejects zero and negatives', () => {
    expect(validatePositiveAmount(0)).toBe(NON_POSITIVE_AMOUNT_MESSAGE)
    expect(validatePositiveAmount('0')).toBe(NON_POSITIVE_AMOUNT_MESSAGE)
    expect(validatePositiveAmount(-5)).toBe(NON_POSITIVE_AMOUNT_MESSAGE)
  })

  it('rejects NaN and non-numeric input', () => {
    expect(validatePositiveAmount(Number.NaN)).toBe(INVALID_AMOUNT_MESSAGE)
    expect(validatePositiveAmount('abc')).toBe(INVALID_AMOUNT_MESSAGE)
    expect(validatePositiveAmount('1e9')).toBe(INVALID_AMOUNT_MESSAGE)
  })
})

describe('react-hook-form rule builders', () => {
  it('requiredPositiveAmount no longer lets NaN through', () => {
    const { validate } = requiredPositiveAmount()

    expect(validate(Number.NaN)).toBe(INVALID_AMOUNT_MESSAGE)
    expect(validate('')).toBe('مبلغ را وارد کنید')
    expect(validate(10)).toBe(true)
  })

  it('requiredNonNegativeAmount accepts 0 but not NaN or negatives', () => {
    const { validate } = requiredNonNegativeAmount('موجودی را وارد کنید')

    expect(validate(0)).toBe(true)
    expect(validate(Number.NaN)).toBe(INVALID_AMOUNT_MESSAGE)
    expect(validate(-1)).toBe('موجودی را وارد کنید')
  })

  it('requiredPositiveInteger reads Persian digits', () => {
    const { validate } = requiredPositiveInteger('موعد قسط', 1, 31)

    expect(validate('۱۵')).toBe(true)
    expect(validate('0')).toBe('موعد قسط را وارد کنید')
    expect(validate('40')).toBe('موعد قسط باید بین 1 تا 31 باشد')
  })
})
