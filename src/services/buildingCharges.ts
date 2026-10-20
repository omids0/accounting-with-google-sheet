import type { BuildingUnit } from './buildingUnits'
import type { ChargeMethod } from '../components/buildings/buildingOptions'

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
