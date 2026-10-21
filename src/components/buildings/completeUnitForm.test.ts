import { describe, expect, it } from 'vitest'

import {
  completionSummary,
  initialUnitForm,
  isUnitComplete,
  unitFormNumbers
} from './completeUnitForm'
import { newStay } from '../../services/buildingResidents'
import { placeholderOwner } from '../../services/buildingSetupActions'
import { newUnit } from '../../services/buildingUnits'

const unit = { ...newUnit({ number: '3', area: 110, people: 3 }), rowNumber: 2 }

const owner = { ...placeholderOwner('3'), id: 'p1', createdAt: '', rowNumber: 2 }

const ownerStay = { ...newStay({ unitId: unit.id, personId: 'p1', role: 'owner' }), rowNumber: 2 }

describe('initialUnitForm', () => {
  it('leaves the name of a placeholder owner empty and follows the method for the charge', () => {
    const form = initialUnitForm(unit, [ownerStay], [owner])

    expect(form.owner.name).toBe('')
    expect(form.area).toBe('110')
    expect(form.charge).toBeNull()
  })

  it('shows the real name, phone and card of a completed owner', () => {
    const done = {
      ...owner,
      placeholder: false,
      firstName: 'علی',
      lastName: 'احمدی',
      phones: [{ number: '0912' }],
      accounts: [{ bankName: '', accountNumber: '6037' }]
    }

    expect(initialUnitForm(unit, [ownerStay], [done]).owner).toEqual({
      name: 'علی احمدی',
      phone: '0912',
      card: '6037'
    })
  })

  it('keeps a unit-specific charge', () => {
    expect(
      initialUnitForm({ ...unit, monthlyCharge: 1_500_000 }, [ownerStay], [owner]).charge
    ).toBe(1_500_000)
  })
})

describe('unitFormNumbers', () => {
  it('reads Persian digits and saves a charge that follows the method as 0', () => {
    const form = { ...initialUnitForm(unit, [ownerStay], [owner]), area: '۱۱۵', parking: '۱' }

    expect(unitFormNumbers(form)).toEqual({
      area: 115,
      people: 3,
      parking: 1,
      storage: 0,
      monthlyCharge: 0
    })
    expect(unitFormNumbers({ ...form, charge: 2_000_000 }).monthlyCharge).toBe(2_000_000)
  })
})

describe('completion', () => {
  it('a unit is complete once its owner is a real person', () => {
    expect(isUnitComplete(unit, [ownerStay], [owner])).toBe(false)
    expect(isUnitComplete(unit, [ownerStay], [{ ...owner, placeholder: false }])).toBe(true)
    expect(isUnitComplete(unit, [], [owner])).toBe(false)
  })

  it('summarizes the units and their occupancy', () => {
    const summary = completionSummary([
      ...Array.from({ length: 7 }, () => ({ occupancy: 'owner-resident' as const })),
      ...Array.from({ length: 4 }, () => ({ occupancy: 'tenant' as const })),
      { occupancy: 'vacant' as const }
    ])

    expect(summary).toBe('۱۲ واحد ثبت شد · ۷ مالک ساکن · ۴ مستأجر · ۱ خالی')
  })
})
