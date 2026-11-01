import { describe, expect, it } from 'vitest'

import { computeFuelEfficiencyL100km } from './vehicleFuelEfficiency'

describe('computeFuelEfficiencyL100km without a previous reading', () => {
  it('leaves the first fill out of the burned litres', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 140370, fuelLiters: 28 },
      { mileage: 140650, fuelLiters: 25 }
    ])

    expect(value).toBeCloseTo((25 / 280) * 100, 5)
  })

  it('sums every fill after the first one', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 1000, fuelLiters: 30 },
      { mileage: 1300, fuelLiters: 20 },
      { mileage: 1500, fuelLiters: 40 }
    ])

    expect(value).toBeCloseTo((60 / 500) * 100, 5)
  })

  it('does not depend on the input order', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 1500, fuelLiters: 40 },
      { mileage: 1000, fuelLiters: 30 },
      { mileage: 1300, fuelLiters: 20 }
    ])

    expect(value).toBeCloseTo(12, 5)
  })

  it('ignores fills without a mileage', () => {
    const value = computeFuelEfficiencyL100km([
      { mileage: 1000, fuelLiters: 30 },
      { fuelLiters: 99 },
      { mileage: 1300, fuelLiters: 15 }
    ])

    expect(value).toBeCloseTo(5, 5)
  })

  it('returns null for a single reading or no distance', () => {
    expect(computeFuelEfficiencyL100km([{ mileage: 1000, fuelLiters: 30 }])).toBeNull()
    expect(
      computeFuelEfficiencyL100km([
        { mileage: 1000, fuelLiters: 30 },
        { mileage: 1000, fuelLiters: 20 }
      ])
    ).toBeNull()
  })
})

describe('computeFuelEfficiencyL100km with a previous reading', () => {
  it('counts every fill and measures from the previous reading', () => {
    const value = computeFuelEfficiencyL100km([{ mileage: 1300, fuelLiters: 30 }], 1000)

    expect(value).toBeCloseTo(10, 5)
  })

  it('works with a single fill in the period', () => {
    const value = computeFuelEfficiencyL100km(
      [
        { mileage: 1200, fuelLiters: 20 },
        { mileage: 1500, fuelLiters: 40 }
      ],
      1000
    )

    expect(value).toBeCloseTo((60 / 500) * 100, 5)
  })

  it('skips readings at or below the previous one', () => {
    const value = computeFuelEfficiencyL100km(
      [
        { mileage: 900, fuelLiters: 50 },
        { mileage: 1200, fuelLiters: 20 }
      ],
      1000
    )

    expect(value).toBeCloseTo(10, 5)
  })

  it('returns null when nothing is past the previous reading', () => {
    expect(computeFuelEfficiencyL100km([{ mileage: 1000, fuelLiters: 20 }], 1000)).toBeNull()
  })
})
