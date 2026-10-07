import { describe, expect, it } from 'vitest'

import { isBankLike, normalizeSmsText, tokenizeSms } from './bankSmsText'

describe('normalizeSmsText', () => {
  it('turns Persian digits, Arabic letters, invisible marks and newlines into one shape', () => {
    expect(normalizeSmsText('بانك ملي\u200c\n\n مانده:۱۲۳\u200f  ريال ')).toBe(
      'بانک ملی مانده:123 ریال'
    )
  })
})

describe('tokenizeSms', () => {
  const numbers = (text: string) =>
    tokenizeSms(normalizeSmsText(text)).flatMap(token =>
      token.kind === 'number' ? [[token.numberKind, token.value]] : []
    )

  it('labels amounts, masked references, dates and times', () => {
    expect(numbers('برداشت:1,250,000 حساب:4567***1234 1405/07/15 14:32')).toEqual([
      ['amount', '1,250,000'],
      ['ref', '4567***1234'],
      ['date', '1405/07/15'],
      ['time', '14:32']
    ])
  })

  it('reads dotted, leading-masked and dashed references as one token', () => {
    expect(numbers('از 1234...5678 کارت ***9876 حساب 205.8000.1234567.1 شبا 0101-234-567')).toEqual(
      [
        ['ref', '1234...5678'],
        ['ref', '***9876'],
        ['ref', '205.8000.1234567.1'],
        ['ref', '0101-234-567']
      ]
    )
  })

  it('keeps the Persian thousands separator inside one amount', () => {
    expect(numbers('مبلغ ۷۵۰٬۰۰۰ ریال')).toEqual([['amount', '750٬000']])
  })

  it('keeps a +/- sign in the text, not in the number', () => {
    const tokens = tokenizeSms('مبلغ: 2,000,000- مانده')

    expect(tokens[1]).toEqual({ kind: 'number', value: '2,000,000', numberKind: 'amount' })
    expect(tokens[2]).toEqual({ kind: 'text', value: '- مانده' })
  })
})

describe('isBankLike', () => {
  it('accepts a money message', () => {
    expect(isBankLike('بانک ملت\nبرداشت:1,250,000\nمانده:8,430,000')).toBe(true)
  })

  it('rejects chat and one-time-password messages', () => {
    expect(isBankLike('سلام ساعت 1500 میام')).toBe(false)
    expect(isBankLike('کد ورود شما: 48213')).toBe(false)
  })

  it('rejects a keyword without a three-digit number', () => {
    expect(isBankLike('مانده حساب خود را بررسی کنید')).toBe(false)
  })
})
