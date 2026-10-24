import {
  chargeDebtor,
  chargeReference,
  creditsOf,
  unitCharge,
  type ChargeDebtor,
  type ChargeResident,
  type UnitCredit
} from './buildingCharges'
import type { BuildingProfile } from './buildingTemplate'
import type { UnitWithRow } from './buildingUnits'
import { CHARGE_METHODS, optionLabel, VACANCY_RULES } from '../components/buildings/buildingOptions'
import type { Receivable } from '../types'

/** Why a unit gets no receivable this month. */
export type SkipReason = 'already' | 'no-debtor' | 'exempt'

/** One line of the issue preview. */
export interface IssueRow {
  unit: UnitWithRow
  debtor: ChargeDebtor | null
  /** «مبلغ ثابت», «خالی · نصف شارژ», «مبلغ ویژهٔ واحد», or why the unit is skipped. */
  basis: string
  amount: number
  /** The part of `amount` the unit's credit pays at once. */
  fromCredit: number
  /** The month already has a charge for this unit (the issue skips it). */
  already: boolean
  skip: SkipReason | null
}

export interface IssuePlan {
  monthKey: string
  rows: IssueRow[]
  /** Sum of the amounts that will be issued. */
  total: number
  /** How many receivables will be written. */
  count: number
}

function basisOf(profile: BuildingProfile, unit: UnitWithRow): string {
  if (unit.occupancy === 'vacant') {
    return `خالی · ${optionLabel(VACANCY_RULES, profile.vacancyRule)}`
  }

  return unit.monthlyCharge ? 'مبلغ ویژهٔ واحد' : optionLabel(CHARGE_METHODS, profile.chargeMethod)
}

/**
 * What issuing `monthKey` would write, unit by unit. Pure and idempotent: a unit that already has
 * the month's `charge:` reference is marked `already` and skipped; a unit with neither a tenant
 * nor an owner, or whose vacancy rule makes the charge zero, is listed but skipped. The credit a
 * unit holds pays its charge first.
 */
export function planIssue(
  profile: BuildingProfile,
  units: UnitWithRow[],
  residents: ChargeResident[],
  receivables: Receivable[],
  credits: UnitCredit[],
  monthKey: string
): IssuePlan {
  const active = units.filter(unit => unit.active)

  const issued = new Set(receivables.map(item => item.reference))

  const rows = active.map<IssueRow>(unit => {
    const debtor = chargeDebtor(unit, residents)

    const amount = unitCharge(profile, unit, active)

    const already = issued.has(chargeReference(unit.id, monthKey))

    const skip: SkipReason | null = already
      ? 'already'
      : !debtor
      ? 'no-debtor'
      : amount <= 0
      ? 'exempt'
      : null

    const credit = credits
      .filter(item => item.unitId === unit.id)
      .reduce((sum, item) => sum + item.amount, 0)

    return {
      unit,
      debtor,
      basis:
        skip === 'no-debtor'
          ? 'بدون ساکن و مالک'
          : skip === 'exempt'
          ? 'معاف'
          : basisOf(profile, unit),
      amount,
      fromCredit: skip ? 0 : Math.min(credit, amount),
      already,
      skip
    }
  })

  const issuable = rows.filter(row => !row.skip)

  return {
    monthKey,
    rows,
    total: issuable.reduce((sum, row) => sum + row.amount, 0),
    count: issuable.length
  }
}

/** `planIssue` on the receivables as they are (credits read from the `credit:` rows). */
export function planIssueFrom(
  profile: BuildingProfile,
  units: UnitWithRow[],
  residents: ChargeResident[],
  receivables: Receivable[],
  monthKey: string
): IssuePlan {
  return planIssue(profile, units, residents, receivables, creditsOf(receivables), monthKey)
}
