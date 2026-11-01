import { describe, expect, it } from 'vitest'

import { computeFuelEfficiencyL100km } from './vehicleFuelEfficiency'

describe('computeFuelEfficiencyL100km', () => {
  it('leaves the last tank out of the burned litres', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 140370, fuelLiters: 28 },
      { mileage: 140650, fuelLiters: 25 }
    ])

    expect(value).toBeCloseTo(10, 5)
  })

  it('sums every fill except the last one', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 1000, fuelLiters: 30 },
      { mileage: 1300, fuelLiters: 20 },
      { mileage: 1500, fuelLiters: 40 }
    ])

    expect(value).toBeCloseTo((50 / 500) * 100, 5)
  })

  it('does not depend on the input order', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 1500, fuelLiters: 40 },
      { mileage: 1000, fuelLiters: 30 },
      { mileage: 1300, fuelLiters: 20 }
    ])

    expect(value).toBeCloseTo(10, 5)
  })

  it('ignores fills without a mileage', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 1000, fuelLiters: 30 },
      { fuelLiters: 99 },
      { mileage: 1300, fuelLiters: 20 }
    ])

    expect(value).toBeCloseTo(10, 5)
  })

  it('returns null for fewer than two readings or no distance', () => {
    expect(computeFuelEfficiencyL100km([{ mileage: 1000, fuelLiters: 30 }])).toBeNull()
    expect(
      computeFuelEfficiencyL100km([
        { mileage: 1000, fuelLiters: 30 },
        { mileage: 1000, fuelLiters: 20 }
      ])
    ).toBeNull()
  })
})
