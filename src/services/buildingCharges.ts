import { unitOfReference } from './buildingSummary'
import type { BuildingUnit } from './buildingUnits'
import { paidAmount, remainingAmount } from './receivablesRow'
import {
  VACANCY_RULES,
  type ChargeMethod,
  type Occupancy
} from '../components/buildings/buildingOptions'
import type { Receivable } from '../types'

/** Charges are rounded to a thousand tomans so a share never shows odd digits. */
const CHARGE_STEP = 1000

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

/** The receivables of one unit that still have something to pay, oldest reference first. */
export function unitOpenReceivables<T extends Receivable>(unitId: string, receivables: T[]): T[] {
  return receivables
    .filter(item => unitOfReference(item.reference ?? '') === unitId && remainingAmount(item) > 0)
    .sort((a, b) => (a.reference ?? '').localeCompare(b.reference ?? ''))
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
