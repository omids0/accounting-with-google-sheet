import { describe, expect, it } from 'vitest'

import {
  isMileageRequired,
  parseMileageRequiredTypes,
  parseNumericField,
  serializeMileageRequiredTypes
} from './vehicleExpenseUtils'
import { VEHICLE_FUEL_EXPENSE_TYPE } from '../components/vehicles/constants'

describe('parseNumericField', () => {
  it('reads Persian and Arabic digits', () => {
    expect(parseNumericField('۱۲۵۰۰')).toBe(12500)
    expect(parseNumericField('٤٥')).toBe(45)
  })

  it('ignores thousands separators', () => {
    expect(parseNumericField('۱٬۲۵۰')).toBe(1250)
    expect(parseNumericField('1,250')).toBe(1250)
  })

  it('falls back to zero for empty or invalid input', () => {
    expect(parseNumericField('')).toBe(0)
    expect(parseNumericField('abc')).toBe(0)
    expect(parseNumericField(Number.NaN)).toBe(0)
    expect(parseNumericField(42)).toBe(42)
  })
})

describe('mileage required types', () => {
  it('requires the mileage for fuel only until the profile says otherwise', () => {
    expect(parseMileageRequiredTypes(undefined)).toEqual([VEHICLE_FUEL_EXPENSE_TYPE])
    expect(parseMileageRequiredTypes('')).toEqual([VEHICLE_FUEL_EXPENSE_TYPE])
    expect(isMileageRequired(undefined, VEHICLE_FUEL_EXPENSE_TYPE)).toBe(true)
    expect(isMileageRequired(undefined, 'تعمیر')).toBe(false)
  })

  it('round-trips a chosen list and an explicit «none»', () => {
    const list = [VEHICLE_FUEL_EXPENSE_TYPE, 'تعویض روغن']

    expect(parseMileageRequiredTypes(serializeMileageRequiredTypes(list))).toEqual(list)
    expect(serializeMileageRequiredTypes([])).toBe('-')
    expect(parseMileageRequiredTypes('-')).toEqual([])
  })

  it('lets a vehicle make even fuel optional', () => {
    expect(isMileageRequired({ mileageRequiredTypes: [] }, VEHICLE_FUEL_EXPENSE_TYPE)).toBe(false)
    expect(isMileageRequired({ mileageRequiredTypes: ['تعمیر'] }, ' تعمیر ')).toBe(true)
  })
})
