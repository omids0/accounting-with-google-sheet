import { describe, expect, it } from 'vitest'

import {
  isLegacyMachineExpenseCategory,
  removeLegacyMachineCategory
} from './migrateLegacyMachineExpenseCategory'
import { VEHICLE_EXPENSE_CATEGORY } from '../components/vehicles/constants'

describe('migrateLegacyMachineExpenseCategory helpers', () => {
  it('detects legacy machine category', () => {
    expect(isLegacyMachineExpenseCategory('ماشین')).toBe(true)
    expect(isLegacyMachineExpenseCategory(' ماشین ')).toBe(true)
    expect(isLegacyMachineExpenseCategory('خودرو')).toBe(false)
  })

  it('removes legacy category and keeps locked vehicle category', () => {
    expect(removeLegacyMachineCategory(['خوراک', 'ماشین', 'حمل‌ونقل'])).toEqual([
      'خوراک',
      'حمل‌ونقل',
      VEHICLE_EXPENSE_CATEGORY
    ])
  })
})
