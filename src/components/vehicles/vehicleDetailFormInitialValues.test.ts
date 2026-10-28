import { describe, expect, it } from 'vitest'

import { buildCompleteInitialValues } from './vehicleDetailFormInitialValues'

const periodic = { currentMileage: 106_850, intervalKm: 5000, amount: 0 } as never
const vehicle = (mileage: number) => ({ mileage } as never)

describe('buildCompleteInitialValues', () => {
  it('offers the car odometer, not the previous service km, and updates the mileage', () => {
    expect(buildCompleteInitialValues(periodic, vehicle(112_100))).toMatchObject({
      mileage: '112100',
      isHistorical: false
    })
  })

  it('never offers less than the last known service km', () => {
    expect(buildCompleteInitialValues(periodic, vehicle(100_000))?.mileage).toBe('106850')
  })
})
