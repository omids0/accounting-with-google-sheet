import { describe, expect, it } from 'vitest'

import { parseNumeric, parseNumericStrict } from './parseNumeric'

describe('parseNumericStrict', () => {
  it.each([
    ['0', 0],
    ['12', 12],
    ['-12', -12],
    ['+12', 12],
    ['12.5', 12.5],
    ['.5', 0.5],
    ['5.', 5],
    ['  42  ', 42],
    ['1,500,000', 1500000],
    ['1 500 000', 1500000],
    ['1 500', 1500]
  ])('parses plain ASCII %j', (input, expected) => {
    expect(parseNumericStrict(input)).toBe(expected)
  })

  it.each([
    ['۱۲۳', 123],
    ['٤٥٦', 456],
    ['۱۲٫۵', 12.5],
    ['٠٫٢٥', 0.25],
    ['۱٬۵۰۰٬۰۰۰', 1500000],
    ['۱۲٬۵۰۰٫۷۵', 12500.75],
    ['۱،۵۰۰', 1500],
    ['۱۲٫۵۰۰٫۰۰۰', 12500000]
  ])('parses Persian/Arabic forms %j', (input, expected) => {
    expect(parseNumericStrict(input)).toBe(expected)
  })

  it.each([
    ['−123', -123],
    ['−۱۲٫۵', -12.5],
    ['123-', -123],
    ['۱۲۳-', -123],
    ['‎-1,000', -1000],
    ['‏۱۲۳−', -123],
    ['－5', -5]
  ])('handles minus variants %j', (input, expected) => {
    expect(parseNumericStrict(input)).toBe(expected)
  })

  it.each([
    '',
    '   ',
    ',',
    'abc',
    '12abc',
    '0x10',
    '0X1F',
    '1e9',
    '1E+3',
    '2.5e-3',
    'Infinity',
    '-Infinity',
    'NaN',
    '1.2.3',
    '--5',
    '-5-',
    '۱۲٫۵.۳'
  ])('rejects %j', input => {
    expect(parseNumericStrict(input)).toBeNull()
  })

  it('handles numbers and nullish values', () => {
    expect(parseNumericStrict(7)).toBe(7)
    expect(parseNumericStrict(-0.5)).toBe(-0.5)
    expect(parseNumericStrict(Number.NaN)).toBeNull()
    expect(parseNumericStrict(Number.POSITIVE_INFINITY)).toBeNull()
    expect(parseNumericStrict(null)).toBeNull()
    expect(parseNumericStrict(undefined)).toBeNull()
  })
})

describe('parseNumeric', () => {
  it('reads invalid or empty input as 0', () => {
    expect(parseNumeric('')).toBe(0)
    expect(parseNumeric(undefined)).toBe(0)
    expect(parseNumeric(null)).toBe(0)
    expect(parseNumeric('0x10')).toBe(0)
    expect(parseNumeric('1e9')).toBe(0)
    expect(parseNumeric('abc')).toBe(0)
    expect(parseNumeric(Number.NaN)).toBe(0)
  })

  it('no longer drops the Persian decimal separator', () => {
    expect(parseNumeric('۱۲٫۵')).toBe(12.5)
  })

  it('matches Number() for every plain integer/decimal sheet cell', () => {
    for (const cell of ['0', '1', '250000', '100000000', '-75000', '3.25', '0.1', '999999999999']) {
      expect(parseNumeric(cell)).toBe(Number(cell))
    }
  })
})
