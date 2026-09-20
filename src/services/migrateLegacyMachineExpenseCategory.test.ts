import { describe, expect, it } from 'vitest'

import { CHECK_EXPENSE_CATEGORY } from './checks'
import { INSTALLMENT_EXPENSE_CATEGORY } from './installmentsConstants'
import {
  isLegacyMachineExpenseCategory,
  removeLegacyMachineCategory
} from './migrateLegacyMachineExpenseCategory'
import { VEHICLE_EXPENSE_CATEGORY } from '../components/vehicles/constants'
import { OTHER_CATEGORY } from '../utils/categoryOrdering'
import { RECONCILIATION_CATEGORY } from '../utils/protectedCategories'

describe('migrateLegacyMachineExpenseCategory helpers', () => {
  it('detects legacy machine category', () => {
    expect(isLegacyMachineExpenseCategory('ماشین')).toBe(true)
    expect(isLegacyMachineExpenseCategory(' ماشین ')).toBe(true)
    expect(isLegacyMachineExpenseCategory('خودرو')).toBe(false)
  })

  it('removes legacy category and keeps the locked categories with «سایر» last', () => {
    expect(removeLegacyMachineCategory(['خوراک', 'ماشین', 'حمل‌ونقل'])).toEqual([
      'خوراک',
      'حمل‌ونقل',
      VEHICLE_EXPENSE_CATEGORY,
      RECONCILIATION_CATEGORY,
      INSTALLMENT_EXPENSE_CATEGORY,
      CHECK_EXPENSE_CATEGORY,
      OTHER_CATEGORY
    ])
  })
})
