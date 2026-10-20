import { describe, expect, it } from 'vitest'

import { smsCardTokens } from './bankSmsCards'
import { newStay } from './buildingResidents'
import {
  amountFit,
  amountMatchText,
  bulkAction,
  buildSmsUnitInputs,
  matchUnits,
  senderCardTokens,
  unitOffer,
  unitPickLabel,
  unitReason,
  unitSuggestionTitle,
  type SmsUnitInput
} from './buildingSmsMatch'
import { newUnit } from './buildingUnits'
import type { Counterparty, Receivable } from '../types'

const unit = (number: string, patch: Partial<SmsUnitInput> = {}): SmsUnitInput => ({
  id: `u${number}`,
  number,
  debtorId: `p${number}`,
  name: `ساکن ${number}`,
  cards: [],
  open: 0,
  charge: 1_200_000,
  month: null,
  ...patch
})

/** Rezaei (unit 4) pays from 6219…1100; units 3, 5, 8 owe two months. */
const units = [
  unit('3', { open: 2_400_000, month: '1405-06' }),
  unit('4', { cards: ['6219861012341100'], open: 1_200_000, month: '1405-07', name: 'رضایی' }),
  unit('5', { open: 2_400_000, month: '1405-06' }),
  unit('8', { open: 2_400_000, month: '1405-06' }),
  unit('9', { open: 0, charge: 900_000 })
]
const rezaei = smsCardTokens('از کارت 6219***1100')

describe('amountFit', () => {
  it('fits the whole open balance, the charge or up to six charges', () => {
    expect(amountFit(1_200_000, units[1])).toEqual({ by: 'balance' })
    expect(amountFit(3_600_000, units[1])).toEqual({ by: 'charge', months: 3 })
    expect(amountFit(7_200_000, units[1])).toEqual({ by: 'charge', months: 6 })
    expect(amountFit(8_400_000, units[1])).toBeNull()
    expect(amountFit(1_000_000, units[1])).toBeNull()
    expect(amountFit(0, units[1])).toBeNull()
  })

  it('prefers the balance over a charge multiple', () => {
    expect(amountFit(2_400_000, units[0])).toEqual({ by: 'balance' })
    expect(amountFit(2_400_000, units[4])).toBeNull()
  })
})

describe('matchUnits', () => {
  it('card + amount: one suggestion', () => {
    const match = matchUnits({ amount: 1_200_000, tokens: rezaei }, units)

    expect(match.kind).toBe('card')
    if (match.kind !== 'card') return
    expect(match.candidate.unit.number).toBe('4')
    expect(match.candidate).toMatchObject({ byCard: true, fit: { by: 'balance' } })
  })

  it('card only: still the payer’s unit, though the amount fits nothing', () => {
    const match = matchUnits({ amount: 777_000, tokens: rezaei }, units)

    expect(match.kind).toBe('card')
    if (match.kind !== 'card') return
    expect(match.candidate).toMatchObject({ byCard: true, fit: null })
    expect(match.candidate.unit.number).toBe('4')
  })

  it('amount only: a list to pick from, an exact balance first, never a single answer', () => {
    const match = matchUnits({ amount: 2_400_000, tokens: [] }, units)

    expect(match.kind).toBe('amount')
    if (match.kind !== 'amount') return
    expect(match.candidates.map(item => item.unit.number)).toEqual(['3', '5', '8', '4'])
    expect(match.candidates.every(item => !item.byCard)).toBe(true)
  })

  it('amount only matches every unit with the same charge (a fixed-charge building)', () => {
    const fixed = ['1', '2', '3'].map(number => unit(number))
    const match = matchUnits({ amount: 1_200_000, tokens: [] }, fixed)

    expect(match.kind).toBe('amount')
    if (match.kind !== 'amount') return
    expect(match.candidates).toHaveLength(3)
  })

  it('a card that is not the payer’s does not make it a card match', () => {
    const stranger = smsCardTokens('از کارت 6037***9999')
    const match = matchUnits({ amount: 2_400_000, tokens: stranger }, units)

    expect(match.kind).toBe('amount')
  })

  it('multiple: the card fits several units (one person owns two)', () => {
    const owner = ['6219861012341100']
    const two = [unit('1', { cards: owner, open: 100 }), unit('2', { cards: owner, open: 200 })]

    expect(matchUnits({ amount: 200, tokens: rezaei }, two).kind).toBe('card')
    const none = matchUnits({ amount: 500, tokens: rezaei }, two)

    expect(none.kind).toBe('multiple')
    if (none.kind !== 'multiple') return
    expect(none.candidates.map(item => item.unit.number)).toEqual(['1', '2'])

    const both = [unit('1', { cards: owner, open: 300 }), unit('2', { cards: owner, open: 300 })]
    const same = matchUnits({ amount: 300, tokens: rezaei }, both)

    expect(same.kind).toBe('multiple')
  })

  it('none: no card, no fitting amount', () => {
    expect(matchUnits({ amount: 123_456, tokens: [] }, units)).toEqual({ kind: 'none' })
    expect(matchUnits({ amount: 123_456, tokens: rezaei.slice(0, 0) }, [])).toEqual({
      kind: 'none'
    })
  })
})

describe('unitOffer', () => {
  it('offers a card match as a suggestion and the rest as a pick', () => {
    const card = unitOffer(matchUnits({ amount: 1_200_000, tokens: rezaei }, units))

    expect(card?.kind).toBe('card')

    const pick = unitOffer(matchUnits({ amount: 2_400_000, tokens: [] }, units))

    expect(pick?.kind).toBe('pick')
    expect(pick && 'text' in pick ? pick.text : '').toContain('کدام؟')
    expect(unitOffer({ kind: 'none' })).toBeNull()
  })
})

describe('texts', () => {
  const card = matchUnits({ amount: 1_200_000, tokens: rezaei }, units)

  it('names the suggestion «شارژ مهر · واحد ۴ · رضایی»', () => {
    if (card.kind !== 'card') throw new Error('expected a card match')

    expect(
      unitSuggestionTitle({ ...card.candidate, unit: { ...card.candidate.unit, month: '1405-07' } })
    ).toBe('شارژ مهر · واحد ۴ · رضایی')
    expect(unitReason(card.candidate)).toBe('کارت ساکن + کل بدهی')
    expect(unitPickLabel(units[0])).toBe('واحد ۳ · ساکن 3')
  })

  it('says how many months of charge an amount-only deposit is', () => {
    const three = [unit('3', { open: 0 }), unit('5', { open: 0 }), unit('8', { open: 0 })]
    const match = matchUnits({ amount: 2_400_000, tokens: [] }, three)

    if (match.kind !== 'amount') throw new Error('expected an amount match')
    expect(amountMatchText(match.candidates)).toBe('= ۲ ماه شارژ واحدهای ۳، ۵، ۸ — کدام؟')
  })

  it('falls back to a general line when the fits differ', () => {
    const match = matchUnits({ amount: 2_400_000, tokens: [] }, units.slice(0, 1).concat(unit('7')))

    if (match.kind !== 'amount') throw new Error('expected an amount match')
    expect(amountMatchText(match.candidates)).toContain('می‌خواند')
  })
})

describe('senderCardTokens', () => {
  it('leaves out the fund’s own card', () => {
    const body = 'واریز:1,200,000\nحساب:6104***3210\nاز کارت 6219***1100'
    const fund = [{ title: 'ملت', cardNumber: '6104337812343210', accountNumber: '', iban: '' }]

    expect(senderCardTokens(body, fund)).toEqual([{ digits: '1100', masked: true, head: '6219' }])
    expect(senderCardTokens(body, [])).toHaveLength(2)
  })
})

describe('buildSmsUnitInputs', () => {
  const person = (
    id: string,
    lastName: string,
    accountNumber = ''
  ): Counterparty & { rowNumber: number } => ({
    id,
    createdAt: '',
    firstName: '',
    lastName,
    birthDate: '',
    address: '',
    location: null,
    phones: [],
    accounts: accountNumber ? [{ bankName: 'ملت', accountNumber }] : [],
    note: '',
    rowNumber: 2
  })

  const u1 = { ...newUnit({ number: '1', area: 100 }), rowNumber: 2 }

  const u2 = { ...newUnit({ number: '2', area: 100 }), rowNumber: 3 }

  const persons = [
    person('o1', 'موسوی', '6219-8610-1234-1100'),
    person('t1', 'کاظمی', '6037997512345678')
  ]

  const stays = [
    { ...newStay({ unitId: u1.id, personId: 'o1', role: 'owner' }), rowNumber: 2 },
    { ...newStay({ unitId: u2.id, personId: 'o1', role: 'owner' }), rowNumber: 3 },
    { ...newStay({ unitId: u2.id, personId: 't1', role: 'tenant' }), rowNumber: 4 }
  ]

  const owed: Receivable = {
    id: 'r1',
    createdAt: '',
    title: '',
    debtor: '',
    category: 'شارژ ساختمان',
    amount: 1_200_000,
    borrowDate: '2026-10-10',
    note: '',
    payments: [],
    reference: `charge:${u2.id}:1405-07`
  }

  const profile = {
    name: 'نرگس',
    address: '',
    floors: 1,
    defaultCharge: 1_200_000,
    chargeMethod: 'fixed' as const,
    issueDay: 1,
    dueDay: 10,
    vacancyRule: 'full' as const
  }

  it('takes the cards of the current debtor: the tenant when there is one', () => {
    const inputs = buildSmsUnitInputs({
      units: [u1, u2],
      stays,
      persons,
      receivables: [owed],
      profile
    })

    expect(inputs[0]).toMatchObject({
      number: '1',
      name: 'موسوی',
      debtorId: 'o1',
      cards: ['6219861012341100'],
      open: 0,
      charge: 1_200_000,
      month: null
    })
    expect(inputs[1]).toMatchObject({
      number: '2',
      name: 'کاظمی',
      cards: ['6037997512345678'],
      open: 1_200_000,
      month: '1405-07'
    })
  })

  it('skips a unit that is switched off and tolerates a unit without a debtor', () => {
    const off = { ...u1, active: false }
    const inputs = buildSmsUnitInputs({
      units: [off, u2],
      stays: [],
      persons,
      receivables: [],
      profile
    })

    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toMatchObject({ debtorId: '', name: '', cards: [] })
  })
})

describe('bulkAction («ثبت همهٔ شناخته‌شده‌ها»)', () => {
  it('takes only card-matched deposits as unit payments', () => {
    expect(bulkAction(matchUnits({ amount: 1_200_000, tokens: rezaei }, units))).toBe('unit')
    expect(bulkAction(matchUnits({ amount: 777_000, tokens: rezaei }, units))).toBe('unit')
  })

  it('never takes an amount-only or ambiguous match', () => {
    expect(bulkAction(matchUnits({ amount: 2_400_000, tokens: [] }, units))).toBe('never')
    const owner = ['6219861012341100']
    const two = [unit('1', { cards: owner, open: 100 }), unit('2', { cards: owner, open: 200 })]

    expect(bulkAction(matchUnits({ amount: 500, tokens: rezaei }, two))).toBe('never')
  })

  it('leaves a deposit no unit is in question for to the round-6 income rules', () => {
    expect(bulkAction(matchUnits({ amount: 123_456, tokens: [] }, units))).toBe('income')
    expect(bulkAction(null)).toBe('income')
  })
})
