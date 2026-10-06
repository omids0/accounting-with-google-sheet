import { describe, expect, it } from 'vitest'

import { parseNumericField } from './vehicleExpenseUtils'

describe('parseNumericField', () => {
  it('reads Persian and Arabic digits', () => {
    expect(parseNumericField('۱۲۵۰۰')).toBe(12500)
    expect(parseNumericField('٤٥')).toBe(45)
  })

  it('ignores thousands separators', () => {
    expect(parseNumericField('۱٬۲۵۰')).toBe(1250)
    expect(parseNumericField('1,250')).toBe(1250)
  })

  it('falls back to zero for empty or invalid input', () => {
    expect(parseNumericField('')).toBe(0)
    expect(parseNumericField('abc')).toBe(0)
    expect(parseNumericField(Number.NaN)).toBe(0)
    expect(parseNumericField(42)).toBe(42)
  })
})
