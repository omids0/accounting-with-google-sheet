import { describe, expect, it } from 'vitest'

import { baseChargeFor } from './buildingCharges'

const units = [
  { area: 80, people: 1 },
  { area: 100, people: 2 },
  { area: 120, people: 3 }
]

describe('baseChargeFor', () => {
  it('charges the default to every unit under the fixed method', () => {
    const profile = { defaultCharge: 1_200_000, chargeMethod: 'fixed' as const }

    expect(units.map(unit => baseChargeFor(profile, unit, units))).toEqual([
      1_200_000, 1_200_000, 1_200_000
    ])
  })

  it('scales by area against the average unit and rounds to a thousand', () => {
    const profile = { defaultCharge: 1_000_000, chargeMethod: 'area' as const }

    expect(units.map(unit => baseChargeFor(profile, unit, units))).toEqual([
      800_000, 1_000_000, 1_200_000
    ])
  })

  it('collects the default charge per unit over the whole building', () => {
    const profile = { defaultCharge: 1_500_000, chargeMethod: 'people' as const }

    const total = units.reduce((sum, unit) => sum + baseChargeFor(profile, unit, units), 0)

    expect(total).toBe(1_500_000 * units.length)
  })

  it('falls back to the default when the weights are missing', () => {
    const profile = { defaultCharge: 900_000, chargeMethod: 'area' as const }

    expect(baseChargeFor(profile, { area: 0, people: 0 }, [{ area: 0, people: 0 }])).toBe(900_000)
    expect(baseChargeFor(profile, { area: 50, people: 1 }, [])).toBe(900_000)
  })
})
