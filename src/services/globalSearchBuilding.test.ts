import { describe, expect, it } from 'vitest'

import { newStay } from './buildingResidents'
import { newUnit } from './buildingUnits'
import { searchEntries } from './globalSearch'
import { buildingSearchEntries } from './globalSearchBuilding'
import type { Counterparty } from '../types'

const person = (id: string, lastName: string, phone = ''): Counterparty => ({
  id,
  createdAt: '',
  firstName: '',
  lastName,
  birthDate: '',
  address: '',
  location: null,
  phones: phone ? [{ number: phone }] : [],
  accounts: [],
  note: ''
})

const unit3 = newUnit({ number: '3', floor: 1, area: 90, monthlyCharge: 1_500_000 })

const unit4 = { ...newUnit({ number: '4', floor: 2, area: 80 }), active: false }

const stays = [
  newStay({ unitId: unit3.id, personId: 'o', role: 'owner' }),
  newStay({ unitId: unit3.id, personId: 't', role: 'tenant', to: '2026-01-01' })
]

const entries = buildingSearchEntries({
  units: [unit3, unit4],
  stays,
  counterparties: [person('o', 'موسوی', '09121234567'), person('t', 'کاظمی')]
})

describe('buildingSearchEntries', () => {
  it('lists the active units and every stay, past ones too', () => {
    expect(entries.map(entry => [entry.group, entry.title])).toEqual([
      ['units', 'واحد ۳'],
      ['residents', 'موسوی'],
      ['residents', 'کاظمی']
    ])
    expect(entries[2].subtitle).toContain('مستأجر سابق')
  })

  it('finds a unit by its number or its resident and a resident by name or phone', () => {
    const ids = (query: string) => searchEntries(entries, query).groups.map(group => group.id)

    expect(ids('واحد ۳')).toEqual(['units', 'residents'])
    expect(searchEntries(entries, 'موسوی').groups.map(group => group.id)).toEqual([
      'units',
      'residents'
    ])
    expect(ids('09121234567')).toEqual(['residents'])
    expect(ids('1500000')).toEqual(['units'])
  })

  it('opens the unit page from either kind of result', () => {
    expect(entries.every(entry => entry.unitId === unit3.id)).toBe(true)
  })
})
