import { describe, expect, it } from 'vitest'

import { newStay } from './buildingResidents'
import { buildSmsUnitInputs } from './buildingSmsMatch'
import { newUnit } from './buildingUnits'
import type { Counterparty } from '../types'

const person = (id: string, me = false): Counterparty & { rowNumber: number } => ({
  id,
  createdAt: '',
  firstName: '',
  lastName: id,
  birthDate: '',
  address: '',
  location: null,
  phones: [],
  accounts: [],
  note: '',
  me,
  rowNumber: 2
})

describe("buildSmsUnitInputs: the manager's own unit", () => {
  it('flags only a unit whose current debtor is the «من» person', () => {
    const own = { ...newUnit({ number: '1' }), rowNumber: 2 }

    const other = { ...newUnit({ number: '2' }), rowNumber: 3 }

    const inputs = buildSmsUnitInputs({
      units: [own, other],
      stays: [
        { ...newStay({ unitId: own.id, personId: 'me', role: 'owner' }), rowNumber: 2 },
        { ...newStay({ unitId: other.id, personId: 'x', role: 'owner' }), rowNumber: 3 }
      ],
      persons: [person('me', true), person('x')],
      receivables: [],
      profile: null
    })

    expect(inputs.map(input => input.me)).toEqual([true, false])
  })

  it('does not flag the manager as the owner of a unit a tenant lives in', () => {
    const unit = { ...newUnit({ number: '1', occupancy: 'tenant' }), rowNumber: 2 }

    const [input] = buildSmsUnitInputs({
      units: [unit],
      stays: [
        { ...newStay({ unitId: unit.id, personId: 'me', role: 'owner' }), rowNumber: 2 },
        { ...newStay({ unitId: unit.id, personId: 'x', role: 'tenant' }), rowNumber: 3 }
      ],
      persons: [person('me', true), person('x')],
      receivables: [],
      profile: null
    })

    expect(input.me).toBe(false)
  })
})
