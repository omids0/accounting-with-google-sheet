import { describe, expect, it } from 'vitest'

import { anyCardMatches, cardTokenMatches, savedCardDigits, smsCardTokens } from './bankSmsCards'

describe('smsCardTokens', () => {
  it('reads masked cards by their visible tail', () => {
    expect(smsCardTokens('واریز 1,200,000 به حساب 6104***3210')).toEqual([
      { digits: '3210', masked: true, head: '6104' }
    ])
    expect(smsCardTokens('از کارت ۶۲۱۹…۱۱۰۰')).toEqual([
      { digits: '1100', masked: true, head: '6219' }
    ])
    expect(smsCardTokens('کارت ***4321')).toEqual([{ digits: '4321', masked: true, head: '' }])
  })

  it('reads whole and spaced card numbers', () => {
    expect(smsCardTokens('از کارت 6219861012341100')).toEqual([
      { digits: '6219861012341100', masked: false }
    ])
    expect(smsCardTokens('از کارت 6219 8610 1234 1100')).toEqual([
      { digits: '6219861012341100', masked: false }
    ])
    expect(smsCardTokens('حساب 205.8000.1234567.1')).toEqual([
      { digits: '205800012345671', masked: false }
    ])
  })

  it('ignores amounts, dates, times and short numbers', () => {
    expect(smsCardTokens('واریز:1,250,000\nمانده:8,430,000\n1405/07/15 14:32\n0715-14')).toEqual([])
    expect(smsCardTokens('مبلغ 125000 ریال')).toEqual([])
  })
})

describe('cardTokenMatches', () => {
  const masked = { digits: '3210', masked: true }

  const whole = { digits: '6219861012341100', masked: false }

  it('compares a masked tail with the end of the saved number, either way round', () => {
    expect(cardTokenMatches(masked, '6104337812343210')).toBe(true)
    expect(cardTokenMatches(masked, '3210')).toBe(true)
    expect(cardTokenMatches(masked, '6104337812343211')).toBe(false)
    expect(cardTokenMatches({ digits: '12343210', masked: true }, '3210')).toBe(true)
  })

  it('also needs the visible start of a masked number to agree', () => {
    const [own] = smsCardTokens('حساب 6104***5678')
    const [other] = smsCardTokens('از کارت 5022***5678')

    expect(own.head).toBe('6104')
    expect(cardTokenMatches(own, '6104337812345678')).toBe(true)
    expect(cardTokenMatches(other, '6104337812345678')).toBe(false)
    // A last-4 stub has no start to compare.
    expect(cardTokenMatches(other, '5678')).toBe(true)
    expect(smsCardTokens('کارت ***5678')[0].head).toBe('')
  })

  it('never matches a whole SMS number against a last-4 stub', () => {
    expect(cardTokenMatches({ digits: '12503210', masked: false }, '3210')).toBe(false)
    expect(cardTokenMatches(whole, '6219861012341100')).toBe(true)
    expect(cardTokenMatches(whole, '6219861012341101')).toBe(false)
  })

  it('needs at least four saved digits', () => {
    expect(cardTokenMatches(masked, '210')).toBe(false)
    expect(savedCardDigits('6104-3378-1234-3210')).toBe('6104337812343210')
    expect(savedCardDigits('IR1')).toBe('')
    expect(savedCardDigits(undefined)).toBe('')
  })

  it('anyCardMatches checks every token against every saved number', () => {
    expect(anyCardMatches([masked, whole], ['1111111111111111', '6219861012341100'])).toBe(true)
    expect(anyCardMatches([masked], ['1111111111111111'])).toBe(false)
    expect(anyCardMatches([], ['6104337812343210'])).toBe(false)
  })
})
