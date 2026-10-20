import { monthKeyFor, monthKeyOfIso, previousMonthKey } from './buildingMonths'
import { unitOfReference } from './buildingSummary'
import type { BuildingUnit } from './buildingUnits'
import { paidAmount, remainingAmount } from './receivablesRow'
import {
  VACANCY_RULES,
  type ChargeMethod,
  type Occupancy,
  type ResidentRole
} from '../components/buildings/buildingOptions'
import type { Receivable } from '../types'
import { isoToJalali } from '../utils/jalaliDate'

/** Charges are rounded to a thousand tomans so a share never shows odd digits. */
const CHARGE_STEP = 1000

/** The automatic issue catches up at most this many months. */
const MAX_BACK_MONTHS = 12

type Weighted = Pick<BuildingUnit, 'area' | 'people'>

/**
 * What a unit pays under the building's method, before a unit-specific amount or the vacancy
 * rule: «fixed» is the default charge; «area» / «people» scale it by the unit's weight against
 * the average unit, so the building as a whole still collects the default charge per unit.
 * Step 4 builds the issue, statement and credit logic around it.
 */
export function baseChargeFor(
  profile: { defaultCharge: number; chargeMethod: ChargeMethod },
  unit: Weighted,
  units: Weighted[]
): number {
  const { defaultCharge, chargeMethod } = profile

  if (chargeMethod === 'fixed' || units.length === 0) return defaultCharge

  const weight = (item: Weighted) => (chargeMethod === 'area' ? item.area : item.people)

  const average = units.reduce((sum, item) => sum + weight(item), 0) / units.length

  if (average <= 0) return defaultCharge

  return Math.round((defaultCharge * weight(unit)) / average / CHARGE_STEP) * CHARGE_STEP
}

/**
 * The unit's monthly charge: its own amount when it has one (`monthlyCharge`), else the
 * building's method; a vacant unit pays the part the profile's vacancy rule leaves.
 */
export function unitCharge(
  profile: { defaultCharge: number; chargeMethod: ChargeMethod; vacancyRule: string },
  unit: Weighted & Pick<BuildingUnit, 'monthlyCharge' | 'occupancy'>,
  units: Weighted[],
  occupancy: Occupancy = unit.occupancy
): number {
  const charge = unit.monthlyCharge || baseChargeFor(profile, unit, units)

  if (occupancy !== 'vacant') return charge

  const rule = VACANCY_RULES.find(item => item.value === profile.vacancyRule)?.rule ?? 1

  return Math.round(charge * rule)
}

/** A credit a unit holds (an overpayment kept as `credit:<unitId>`); Step 4 writes and applies it. */
export interface UnitCredit {
  unitId: string
  amount: number
}

/**
 * How old a debt is, as a sortable key: a previous debt comes first, then every month's charge or
 * share by the month it belongs to (a share by the month of its date).
 */
function ageKey(item: Receivable): string {
  const reference = item.reference ?? ''

  if (reference.startsWith('opening:')) return '0'
  if (reference.startsWith('charge:')) return `1${reference.split(':')[2] ?? ''}`

  return `1${monthKeyOfIso(item.borrowDate)}`
}

/** The receivables of one unit that still have something to pay, oldest debt first. */
export function unitOpenReceivables<T extends Receivable>(unitId: string, receivables: T[]): T[] {
  return receivables
    .filter(item => unitOfReference(item.reference ?? '') === unitId && remainingAmount(item) > 0)
    .sort(
      (a, b) =>
        ageKey(a).localeCompare(ageKey(b)) ||
        a.borrowDate.localeCompare(b.borrowDate) ||
        (a.reference ?? '').localeCompare(b.reference ?? '')
    )
}

export interface UnitBalance {
  /** Still to pay across all the unit's charges, shares and previous debts. */
  open: number
  credit: number
  /** Jalali `YYYY-MM` of every month with an open monthly charge, oldest first. */
  months: string[]
  /** Some open receivable was already paid in part. */
  partial: boolean
  /** A capital-expense share is among the open items. */
  hasShare: boolean
  lastPaidAt: string | null
}

/** What a unit owes (or holds in credit) from the receivables addressed to it. */
export function unitBalance(
  unitId: string,
  receivables: Receivable[],
  credits: UnitCredit[] = []
): UnitBalance {
  const own = receivables.filter(item => unitOfReference(item.reference ?? '') === unitId)

  const open = unitOpenReceivables(unitId, own)

  const paidDates = own.flatMap(item => item.payments.map(payment => payment.paidAt)).sort()

  return {
    open: open.reduce((sum, item) => sum + remainingAmount(item), 0),
    credit: credits
      .filter(item => item.unitId === unitId)
      .reduce((sum, item) => sum + item.amount, 0),
    months: [
      ...new Set(
        open.flatMap(item =>
          item.reference?.startsWith('charge:') ? [item.reference.split(':')[2] ?? ''] : []
        )
      )
    ].filter(Boolean),
    partial: open.some(item => paidAmount(item) > 0),
    hasShare: open.some(item => item.reference?.startsWith('share:')),
    lastPaidAt: paidDates.at(-1) ?? null
  }
}

/** Has any unit been billed for this Jalali month? */
export function isMonthIssued(receivables: Receivable[], monthKey: string): boolean {
  return receivables.some(
    item => item.reference?.startsWith('charge:') && item.reference.endsWith(`:${monthKey}`)
  )
}

/** The newest Jalali month any unit was billed for, or null before the first issue. */
export function latestChargeMonth(receivables: Receivable[]): string | null {
  const months = receivables.flatMap(item =>
    item.reference?.startsWith('charge:') ? [item.reference.split(':')[2] ?? ''] : []
  )

  return months.filter(Boolean).sort().at(-1) ?? null
}

/** Someone who lives in or owns a unit (an open or a past stay), with the name to bill. */
export interface ChargeResident {
  unitId: string
  personId: string
  name: string
  role: ResidentRole
  /** The stay is open: active and without an exit date. */
  current: boolean
}

export interface ChargeDebtor {
  id: string
  name: string
  role: ResidentRole
}

/**
 * Who a unit's monthly charge is addressed to: the tenant while one lives there, else the owner;
 * null when the unit has neither (the preview lists it as «بدون ساکن و مالک» and skips it).
 */
export function chargeDebtor(
  unit: { id: string },
  residents: ChargeResident[]
): ChargeDebtor | null {
  const open = residents.filter(item => item.unitId === unit.id && item.current)

  const person =
    open.find(item => item.role === 'tenant') ?? open.find(item => item.role === 'owner')

  return person ? { id: person.personId, name: person.name, role: person.role } : null
}

/** `charge:<unitId>:<YYYY-MM>`: the key that makes issuing a month idempotent. */
export function chargeReference(unitId: string, monthKey: string): string {
  return `charge:${unitId}:${monthKey}`
}

/** What a unit's overpayment is saved as: a receivable row that is spent at the next issue. */
export const CREDIT_REFERENCE_PREFIX = 'credit:'

export const creditReference = (unitId: string) => `${CREDIT_REFERENCE_PREFIX}${unitId}`

/**
 * The credit a unit holds. A credit is a `credit:<unitId>` receivable whose `amount` is what was
 * kept and whose payments are what the issues spent, so what is left is its remaining amount.
 */
export function creditsOf(receivables: Receivable[]): UnitCredit[] {
  return receivables.flatMap(item =>
    item.reference?.startsWith(CREDIT_REFERENCE_PREFIX) && remainingAmount(item) > 0
      ? [
          {
            unitId: item.reference.slice(CREDIT_REFERENCE_PREFIX.length),
            amount: remainingAmount(item)
          }
        ]
      : []
  )
}

/**
 * Months with no charge on/after the issue day, newest last, at most 12 back. Before the first
 * issue only the current due month is returned: the first charge is always manual.
 */
export function missingIssueMonths(
  profile: { issueDay: number },
  receivables: Receivable[],
  todayIso: string
): string[] {
  const { year, month, day } = isoToJalali(todayIso)

  const current = monthKeyFor(year, month)

  const start = day < profile.issueDay ? previousMonthKey(current) : current

  if (!latestChargeMonth(receivables)) return [start]

  const missing: string[] = []

  let key = start

  for (let i = 0; i < MAX_BACK_MONTHS && !isMonthIssued(receivables, key); i += 1) {
    missing.push(key)
    key = previousMonthKey(key)
  }

  return missing.reverse()
}

/** Rows that are one fact each: a second row with the same `مرجع` is a duplicate of the first. */
const UNIQUE_REFERENCE = /^(charge|share|opening):/

/**
 * Two devices issuing the same month leave two rows per `مرجع`. The earliest row (sheet order)
 * stays; a later one with no payment is removed, a later one already paid stays.
 */
export function dedupeChargeReferences<T extends Receivable & { rowNumber?: number }>(
  receivables: T[]
): { keep: T[]; removeUnpaid: T[] } {
  const ordered = [...receivables].sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0))

  const seen = new Set<string>()

  const removeUnpaid: T[] = []

  for (const item of ordered) {
    const reference = item.reference ?? ''

    if (!UNIQUE_REFERENCE.test(reference)) continue

    if (!seen.has(reference)) seen.add(reference)
    else if (paidAmount(item) === 0) removeUnpaid.push(item)
  }

  return { keep: receivables.filter(item => !removeUnpaid.includes(item)), removeUnpaid }
}
