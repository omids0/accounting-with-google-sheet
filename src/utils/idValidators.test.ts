import { describe, expect, it } from 'vitest'

import { digitsOnly, normalizeIranPhone, normalizeSheba, passesLuhn } from './idValidators'

describe('passesLuhn', () => {
  it('accepts a valid card and rejects a changed digit', () => {
    expect(passesLuhn('6037991740000009')).toBe(true)
    expect(passesLuhn('6037991740000008')).toBe(false)
    expect(passesLuhn('1234567812345678')).toBe(false)
  })

  it('rejects anything that is not digits', () => {
    expect(passesLuhn('')).toBe(false)
    expect(passesLuhn('60379917400000x8')).toBe(false)
  })
})

describe('normalizeSheba', () => {
  const sheba = 'IR270170000000100324200001'

  it('keeps a valid Sheba', () => {
    expect(normalizeSheba(sheba)).toBe(sheba)
  })

  it('accepts spaces, lowercase, Persian digits and a missing prefix', () => {
    expect(normalizeSheba('ir27 0170 0000 0010 0324 2000 01')).toBe(sheba)
    expect(normalizeSheba('IR۲۷۰۱۷۰۰۰۰۰۰۰۱۰۰۳۲۴۲۰۰۰۰۱')).toBe(sheba)
    expect(normalizeSheba('270170000000100324200001')).toBe(sheba)
  })

  it('rejects a wrong checksum, length or characters', () => {
    expect(normalizeSheba('IR280170000000100324200001')).toBeNull()
    expect(normalizeSheba('IR27017000000010032420000')).toBeNull()
    expect(normalizeSheba('IR2701700000001003242000011')).toBeNull()
    expect(normalizeSheba('IR27017000000010032420000A')).toBeNull()
    expect(normalizeSheba('')).toBeNull()
  })
})

describe('normalizeIranPhone', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['۰۹۱۲۱۲۳۴۵۶۷', '09121234567'],
    ['+98 912 123 4567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['0912-123-4567', '09121234567'],
    ['02112345678', '02112345678'],
    ['(021) 1234 5678', '02112345678'],
    ['0511234567', '0511234567']
  ])('normalises %s', (raw, expected) => {
    expect(normalizeIranPhone(raw)).toBe(expected)
  })

  it.each([
    '123abc',
    '',
    '0912123456',
    '091212345678',
    '12345678',
    '09a21234567',
    '+1 202 555 0100'
  ])('rejects %s', raw => {
    expect(normalizeIranPhone(raw)).toBeNull()
  })
})

describe('digitsOnly', () => {
  it('turns Persian digits into Latin ones without flagging a change', () => {
    expect(digitsOnly('۱۲۳')).toEqual({ value: '123', changed: false })
    expect(digitsOnly('123')).toEqual({ value: '123', changed: false })
  })

  it('drops other characters and flags it', () => {
    expect(digitsOnly('12a-3')).toEqual({ value: '123', changed: true })
  })
})
