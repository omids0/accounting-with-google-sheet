import {
  anyCardMatches,
  cardTokenMatches,
  savedCardDigits,
  smsCardTokens,
  type CardToken
} from './bankSmsCards'
import { accountCards, type CardAccountSource } from './bankSmsRouting'
import { chargeDebtor, creditsOf, unitBalance, unitCharge } from './buildingCharges'
import { monthName } from './buildingMonths'
import { chargeResidents, type StayWithRow } from './buildingResidents'
import type { BuildingProfile } from './buildingTemplate'
import type { UnitWithRow } from './buildingUnits'
import type { Counterparty, Receivable } from '../types'
import { toPersianDigits } from '../utils/normalizeDigits'

/**
 * Round 11, Step 6: which unit paid. A deposit into a fund account is matched to units by the
 * payer's card (a card saved on the unit's current debtor) and/or by the amount (the unit's open
 * balance, its monthly charge or up to six months of it). A card match is a suggestion the
 * card can confirm with one tap; an amount-only match is only a list to pick from.
 */

/** «Up to six months in one deposit» is still a plausible payment of the charge. */
export const MAX_CHARGE_MULTIPLE = 6

/** What the matcher knows about one unit. */
export interface SmsUnitInput {
  id: string
  number: string
  /** The current debtor ('' when the unit has neither a resident nor an owner). */
  debtorId: string
  name: string
  /** Digits of the bank accounts saved on the debtor's counterparty. */
  cards: string[]
  open: number
  /** The monthly charge (vacancy rule applied). */
  charge: number
  /** Jalali `YYYY-MM` of the oldest unpaid monthly charge, or null. */
  month: string | null
}

/** How the amount fits a unit: its whole open balance, or `months` months of its charge. */
export type SmsAmountFit = { by: 'balance' } | { by: 'charge'; months: number }

export interface SmsUnitCandidate {
  unit: SmsUnitInput
  /** The payer's card is one saved on the unit's debtor. */
  byCard: boolean
  fit: SmsAmountFit | null
}

export type SmsUnitMatch =
  /** One unit: the payer's card is its debtor's (the amount may or may not fit too). */
  | { kind: 'card'; candidate: SmsUnitCandidate }
  /** The card (and amount) fits several units. Never confirmed without a pick. */
  | { kind: 'multiple'; candidates: SmsUnitCandidate[] }
  /** Only the amount fits. Never confirmed without a pick. */
  | { kind: 'amount'; candidates: SmsUnitCandidate[] }
  | { kind: 'none' }

export function amountFit(amount: number, unit: SmsUnitInput): SmsAmountFit | null {
  if (!(amount > 0)) return null
  if (unit.open > 0 && unit.open === amount) return { by: 'balance' }

  if (unit.charge > 0) {
    for (let months = 1; months <= MAX_CHARGE_MULTIPLE; months += 1) {
      if (unit.charge * months === amount) return { by: 'charge', months }
    }
  }

  return null
}

/** Debtors first, an exact balance before a charge multiple, then by door number. */
function rank(candidates: SmsUnitCandidate[]): SmsUnitCandidate[] {
  const weight = (item: SmsUnitCandidate) =>
    (item.unit.open > 0 ? 0 : 2) + (item.fit?.by === 'balance' ? 0 : 1)

  return [...candidates].sort(
    (a, b) =>
      weight(a) - weight(b) || a.unit.number.localeCompare(b.unit.number, 'fa', { numeric: true })
  )
}

/**
 * `tokens` = card numbers in the SMS other than the fund's own (see `senderCardTokens`).
 * Card + amount that fit exactly one unit, or a card that fits exactly one unit, is a `card`
 * match; the card fitting several units is `multiple`; no card but an amount fit is `amount`.
 */
export function matchUnits(
  input: { amount: number; tokens: CardToken[] },
  units: SmsUnitInput[]
): SmsUnitMatch {
  const all = units.map<SmsUnitCandidate>(unit => ({
    unit,
    byCard: input.tokens.length > 0 && anyCardMatches(input.tokens, unit.cards),
    fit: amountFit(input.amount, unit)
  }))

  const carded = all.filter(item => item.byCard)
  const both = carded.filter(item => item.fit)

  if (both.length === 1) return { kind: 'card', candidate: both[0] }
  if (both.length > 1) return { kind: 'multiple', candidates: rank(both) }
  if (carded.length === 1) return { kind: 'card', candidate: carded[0] }
  if (carded.length > 1) return { kind: 'multiple', candidates: rank(carded) }

  const byAmount = all.filter(item => item.fit)

  return byAmount.length ? { kind: 'amount', candidates: rank(byAmount) } : { kind: 'none' }
}

/** A saved card on a person (`CounterpartyAccount.accountNumber` holds card, account or IBAN). */
function personCards(person: Pick<Counterparty, 'accounts'> | undefined): string[] {
  return (person?.accounts ?? [])
    .map(account => savedCardDigits(account.accountNumber))
    .filter(Boolean)
}

export function buildSmsUnitInputs(data: {
  units: UnitWithRow[]
  stays: StayWithRow[]
  persons: Counterparty[]
  receivables: Receivable[]
  profile: BuildingProfile | null
}): SmsUnitInput[] {
  const { stays, persons, receivables, profile } = data

  const active = data.units.filter(unit => unit.active)
  const residents = chargeResidents(stays, persons)
  const credits = creditsOf(receivables)

  return active.map(unit => {
    const debtor = chargeDebtor(unit, residents)
    const balance = unitBalance(unit.id, receivables, credits)

    return {
      id: unit.id,
      number: unit.number,
      debtorId: debtor?.id ?? '',
      name: debtor?.name ?? '',
      cards: personCards(persons.find(person => person.id === debtor?.id)),
      open: balance.open,
      charge: profile ? unitCharge(profile, unit, active) : unit.monthlyCharge,
      month: balance.months[0] ?? null
    }
  })
}

/** The card numbers in the SMS that are not one of the building's own fund accounts. */
export function senderCardTokens(body: string, fund: CardAccountSource[]): CardToken[] {
  const own = fund.flatMap(account => accountCards(account))

  return smsCardTokens(body).filter(token => !own.some(card => cardTokenMatches(token, card)))
}

const fa = (value: string | number) => toPersianDigits(String(value))

/** «شارژ مهر · واحد ۴ · رضایی»: the suggestion line of a card match. */
export function unitSuggestionTitle(candidate: SmsUnitCandidate): string {
  const { unit } = candidate

  return [unit.month ? `شارژ ${monthName(unit.month)}` : '', `واحد ${fa(unit.number)}`, unit.name]
    .filter(Boolean)
    .join(' · ')
}

/** Why the card suggests this unit: «(کارت ساکن + مبلغ شارژ)». */
export function unitReason(candidate: SmsUnitCandidate): string {
  const parts = [
    candidate.byCard ? 'کارت ساکن' : '',
    candidate.fit?.by === 'balance' ? 'کل بدهی' : candidate.fit ? 'مبلغ شارژ' : ''
  ].filter(Boolean)

  return parts.join(' + ')
}

/** The chip / option label of a unit in the picker: «واحد ۳ · موسوی». */
export function unitPickLabel(unit: SmsUnitInput): string {
  return `واحد ${fa(unit.number)}${unit.name ? ` · ${unit.name}` : ''}`
}

/** «= ۲ ماه شارژ واحدهای ۳، ۵، ۸ — کدام؟», the line above the picker of an amount-only match. */
export function amountMatchText(candidates: SmsUnitCandidate[]): string {
  const numbers = candidates.map(item => fa(item.unit.number))
  const shown = numbers.length > 4 ? `${numbers.slice(0, 4).join('، ')} …` : numbers.join('، ')
  const fits = candidates.map(item => item.fit)
  const months = fits[0]?.by === 'charge' ? fits[0].months : 0

  if (months && fits.every(fit => fit?.by === 'charge' && fit.months === months)) {
    return `= ${months === 1 ? 'یک' : fa(months)} ماه شارژ واحدهای ${shown} — کدام؟`
  }

  return `مبلغ با بدهی یا شارژ واحدهای ${shown} می‌خواند — کدام؟`
}

/** What a deposit card shows for a unit match; `null` = nothing to offer (a plain deposit). */
export type SmsUnitOffer =
  | { kind: 'card'; candidate: SmsUnitCandidate }
  /** Several units fit; a unit has to be picked, the primary button stays disabled until then. */
  | { kind: 'pick'; candidates: SmsUnitCandidate[]; text: string }

export function unitOffer(match: SmsUnitMatch): SmsUnitOffer | null {
  switch (match.kind) {
    case 'card':
      return match
    case 'amount':
      return { kind: 'pick', candidates: match.candidates, text: amountMatchText(match.candidates) }
    case 'multiple':
      return {
        kind: 'pick',
        candidates: match.candidates,
        text: 'کارت پرداخت‌کننده به چند واحد می‌خورد — کدام؟'
      }
    default:
      return null
  }
}

/**
 * What «ثبت همهٔ شناخته‌شده‌ها» may do with a deposit: pay the unit when the payer's card is a
 * unit's, save it as income when no unit is in question, and NEVER take an amount-only (or
 * ambiguous) match, which needs a tap on a unit.
 */
export function bulkAction(match: SmsUnitMatch | null): 'unit' | 'income' | 'never' {
  if (!match || match.kind === 'none') return 'income'

  return match.kind === 'card' ? 'unit' : 'never'
}
