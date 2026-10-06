import { describe, expect, it } from 'vitest'

import {
  buildLoanSchedule,
  calculateAnnuityLoan,
  calculateFlatRateLoan,
  calculateLoan,
  validateLoanInput
} from './loanCalculator'

const bankLoan = { principal: 100_000_000, annualRatePercent: 23, months: 18 }

describe('calculateAnnuityLoan', () => {
  it('matches the bank (مرابحه) formula for 100M at 23% over 18 months', () => {
    const result = calculateAnnuityLoan(bankLoan)!

    expect(Math.round(result.monthlyPayment)).toBeGreaterThan(6_620_000)
    expect(Math.round(result.monthlyPayment)).toBeLessThan(6_623_000)
    expect(result.totalInterest / 1_000_000).toBeCloseTo(19.18, 1)
    expect(result.totalPayment).toBeCloseTo(result.monthlyPayment * 18, 6)
  })

  it('splits the principal evenly when the rate is 0', () => {
    const result = calculateAnnuityLoan({ principal: 1_200_000, annualRatePercent: 0, months: 12 })!

    expect(result.monthlyPayment).toBe(100_000)
    expect(result.totalInterest).toBe(0)
  })

  it('rejects invalid input', () => {
    expect(calculateAnnuityLoan({ ...bankLoan, months: 0 })).toBeNull()
    expect(calculateAnnuityLoan({ ...bankLoan, annualRatePercent: -1 })).toBeNull()
    expect(calculateAnnuityLoan({ ...bankLoan, principal: 0 })).toBeNull()
    expect(calculateAnnuityLoan({ ...bankLoan, months: 2.5 })).toBeNull()
    expect(calculateAnnuityLoan({ ...bankLoan, annualRatePercent: Number.NaN })).toBeNull()
  })
})

describe('calculateFlatRateLoan', () => {
  it('keeps the simple-interest result', () => {
    const result = calculateFlatRateLoan(bankLoan)!

    expect(result.totalInterest).toBeCloseTo(34_500_000, 4)
    expect(Math.round(result.monthlyPayment)).toBe(7_472_222)
  })
})

describe('calculateLoan', () => {
  it('dispatches by method', () => {
    expect(calculateLoan('annuity', bankLoan)).toEqual(calculateAnnuityLoan(bankLoan))
    expect(calculateLoan('flat', bankLoan)).toEqual(calculateFlatRateLoan(bankLoan))
  })
})

describe('buildLoanSchedule', () => {
  it.each(['annuity', 'flat'] as const)('%s schedule repays the principal exactly', method => {
    const rows = buildLoanSchedule(method, bankLoan)

    const result = calculateLoan(method, bankLoan)!

    expect(rows).toHaveLength(18)
    expect(rows[17].remaining).toBe(0)
    expect(rows.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(100_000_000, 4)
    expect(rows.reduce((sum, row) => sum + row.interest, 0)).toBeCloseTo(result.totalInterest, 4)

    for (const row of rows) {
      expect(row.payment).toBeCloseTo(result.monthlyPayment, 4)
      expect(row.payment).toBeCloseTo(row.principal + row.interest, 6)
    }
  })

  it('front-loads interest for the annuity method', () => {
    const rows = buildLoanSchedule('annuity', bankLoan)

    expect(rows[0].interest).toBeCloseTo(100_000_000 * (0.23 / 12), 4)
    expect(rows[0].interest).toBeGreaterThan(rows[17].interest)
  })

  it('returns no rows for invalid input', () => {
    expect(buildLoanSchedule('annuity', { ...bankLoan, months: 0 })).toEqual([])
  })
})

describe('validateLoanInput', () => {
  it('accepts valid input', () => {
    expect(validateLoanInput({ principal: 1000, annualRate: '23', months: '18' })).toEqual({})
    expect(validateLoanInput({ principal: 1000, annualRate: '0', months: '۱۲' })).toEqual({})
    expect(validateLoanInput({ principal: 1000, annualRate: '۲۳٫۵', months: '1' })).toEqual({})
  })

  it('flags empty or zero months', () => {
    expect(validateLoanInput({ principal: 1000, annualRate: '23', months: '' }).months).toBeTruthy()
    expect(
      validateLoanInput({ principal: 1000, annualRate: '23', months: '0' }).months
    ).toBeTruthy()
  })

  it('flags a negative or malformed rate', () => {
    expect(validateLoanInput({ principal: 1000, annualRate: '-2', months: '12' }).annualRate).toBe(
      'نرخ سود نمی‌تواند منفی باشد.'
    )
    expect(
      validateLoanInput({ principal: 1000, annualRate: '', months: '12' }).annualRate
    ).toBeTruthy()
    expect(
      validateLoanInput({ principal: 1000, annualRate: '.', months: '12' }).annualRate
    ).toBeTruthy()
  })

  it('flags a missing principal', () => {
    expect(
      validateLoanInput({ principal: '', annualRate: '23', months: '12' }).principal
    ).toBeTruthy()
    expect(
      validateLoanInput({ principal: 0, annualRate: '23', months: '12' }).principal
    ).toBeTruthy()
  })
})
