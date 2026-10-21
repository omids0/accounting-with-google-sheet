import { describe, expect, it } from 'vitest'

import type { ChargeResident } from './buildingCharges'
import { planExpenseSync } from './buildingExpenses'
import { DEFAULT_MANAGED_LISTS } from './buildingLists'
import { newUnit } from './buildingUnits'

const units = ['1', '2', '3'].map(number => ({
  ...newUnit({ number }, ''),
  id: `u${number}`,
  active: number !== '3'
}))

const residents: ChargeResident[] = units.map(unit => ({
  unitId: unit.id,
  personId: `owner-${unit.id}`,
  name: `owner ${unit.id}`,
  role: 'owner',
  current: true
}))

describe('planExpenseSync: archived units', () => {
  it('bills no share to an archived unit', () => {
    const plan = planExpenseSync({
      record: {
        id: 'r1',
        title: 'تعمیر پمپ',
        amount: 3000,
        date: '2026-10-05',
        category: 'تعمیرات',
        subCategory: '',
        kind: 'capital',
        payer: 'fund',
        split: { mode: 'equal', shares: { u1: 1000, u2: 1000, u3: 1000 }, charge: true }
      },
      units,
      residents,
      kinds: DEFAULT_MANAGED_LISTS.EXPENSE_KINDS,
      payers: DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS,
      receivables: [],
      dangs: []
    })

    expect(plan.create.map(draft => draft.unitId)).toEqual(['u1', 'u2'])
  })
})
