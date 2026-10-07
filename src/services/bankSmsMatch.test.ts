import { describe, expect, it } from 'vitest'

import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import { accountMatchesRef, compileTemplate, matchSms, refDigits } from './bankSmsMatch'
import { normalizeSmsText } from './bankSmsText'
import type { SmsTemplate } from '../types'

function templateFrom(sample: string, id: string, accountId: string): SmsTemplate {
  return { id, createdAt: '', accountId, ...guessTemplate(sample) }
}

const MELLAT = BANK_SMS_FIXTURES[0]

describe('compileTemplate', () => {
  it('does not require text after the last captured slot', () => {
    const { regex } = compileTemplate(guessTemplate(MELLAT.sample).parts)

    expect(normalizeSmsText('بانک ملت برداشت:1 حساب:4567***1234 مانده:2')).toMatch(regex)
    expect(normalizeSmsText(MELLAT.next)).toMatch(regex)
  })

  it('requires a sign that directly follows the last captured slot', () => {
    const { regex } = compileTemplate([
      { kind: 'text', value: 'سامان ' },
      { kind: 'slot', role: 'amount' },
      { kind: 'text', value: '- ریال' }
    ])

    expect('سامان 5,000-').toMatch(regex)
    expect('سامان 5,000+').not.toMatch(regex)
  })

  it('reports capture roles in order', () => {
    expect(compileTemplate(guessTemplate(MELLAT.sample).parts).roles).toEqual([
      'amount',
      'accountRef',
      'balance'
    ])
  })
})

describe('matchSms — every fixture bank', () => {
  it.each(BANK_SMS_FIXTURES)('recognises the next $bank message', fixture => {
    const template = templateFrom(fixture.sample, 't1', 'acc1')
    const result = matchSms(fixture.next, [template], [fixtureAccount('acc1')])

    expect(result).toMatchObject({
      kind: 'matched',
      templateId: 't1',
      accountId: 'acc1',
      direction: fixture.direction,
      amount: fixture.expected.amount,
      balance: fixture.expected.balance
    })
  })
})

describe('matchSms — choosing the account', () => {
  const mellatA = templateFrom(MELLAT.sample, 'tA', 'accA')
  const mellatB = templateFrom(MELLAT.sample, 'tB', 'accB')
  const accounts = [
    fixtureAccount('accA', { cardNumber: '6104 3378 0000 1234' }),
    fixtureAccount('accB', { cardNumber: '6104337800009999' })
  ]

  it('uses the masked reference to tell two same-bank accounts apart', () => {
    const other = MELLAT.next.replace('4567***1234', '4567***9999')

    expect(matchSms(MELLAT.next, [mellatA, mellatB], accounts)).toMatchObject({ accountId: 'accA' })
    expect(matchSms(other, [mellatA, mellatB], accounts)).toMatchObject({ accountId: 'accB' })
  })

  it('is ambiguous when the reference cannot decide', () => {
    const blank = [fixtureAccount('accA'), fixtureAccount('accB')]

    expect(matchSms(MELLAT.next, [mellatA, mellatB], blank)).toMatchObject({
      kind: 'ambiguous',
      candidates: [
        { templateId: 'tA', accountId: 'accA' },
        { templateId: 'tB', accountId: 'accB' }
      ],
      amount: 90000
    })
  })

  it('is unknown when the reference belongs to no saved account', () => {
    const stranger = MELLAT.next.replace('4567***1234', '4567***5555')

    expect(matchSms(stranger, [mellatA, mellatB], accounts)).toEqual({ kind: 'unknown' })
  })

  it('ignores templates whose account was deleted', () => {
    expect(matchSms(MELLAT.next, [mellatA], [])).toEqual({ kind: 'unknown' })
  })

  it('does not let a debit template read a credit message', () => {
    const credit = BANK_SMS_FIXTURES[1]

    expect(matchSms(credit.next, [mellatA], accounts)).toEqual({ kind: 'unknown' })
  })

  it('returns irrelevant for a non-bank message', () => {
    expect(matchSms('سلام، ساعت 1500 میام', [mellatA], accounts)).toEqual({ kind: 'irrelevant' })
  })
})

describe('account references', () => {
  it('reads visible digits', () => {
    expect(refDigits('4567***1234')).toBe('1234')
    expect(refDigits('1234...5678')).toBe('5678')
    expect(refDigits('205.8000.1234567.1')).toBe('20580001234567' + '1')
    expect(refDigits('***12')).toBe('')
  })

  it('compares against card, account number and IBAN suffixes', () => {
    const account = fixtureAccount('a', { iban: 'IR12 0170 0000 0010 1234 5670 01' })

    expect(accountMatchesRef(account, '0101234567001')).toBe(true)
    expect(accountMatchesRef(account, '***9999')).toBe(false)
    expect(accountMatchesRef(account, null)).toBe(null)
  })
})
