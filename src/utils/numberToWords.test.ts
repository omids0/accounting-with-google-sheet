import { describe, expect, it } from 'vitest'

import { MAX_AMOUNT } from './amountInput'
import { numberToPersianWords } from './numberToWords'

describe('numberToPersianWords', () => {
  it('spells common amounts', () => {
    expect(numberToPersianWords(0)).toBe('صفر')
    expect(numberToPersianWords(1500)).toBe('یک هزار و پانصد')
    expect(numberToPersianWords(2_000_000)).toBe('دو میلیون')
  })

  it('names the maximum amount', () => {
    expect(numberToPersianWords(MAX_AMOUNT)).toBe('ده تریلیون')
  })

  it.each([MAX_AMOUNT + 1, 1e15, 1e18, 1e20, 123456789012345678901, 1e30, Number.MAX_VALUE])(
    'never prints undefined for %s',
    value => {
      expect(numberToPersianWords(value)).not.toContain('undefined')
    }
  )

  it('returns nothing for invalid input', () => {
    expect(numberToPersianWords(-1)).toBe('')
    expect(numberToPersianWords(Number.NaN)).toBe('')
    expect(numberToPersianWords(Infinity)).toBe('')
  })
})
