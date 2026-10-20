import { describe, expect, it } from 'vitest'

import {
  filterPersons,
  personChipCounts,
  personLabel,
  personLabels,
  type personMatches
} from './counterpartyRows'

const stay = (unitId: string, personId: string, role: 'owner' | 'tenant', to = '') => ({
  unitId,
  personId,
  role,
  active: true,
  to
})

const units = [
  { id: 'u3', number: '3' },
  { id: 'u4', number: '4' }
]

const stays = [
  stay('u3', 'ahmadi', 'owner'),
  stay('u4', 'rezaei', 'tenant'),
  stay('u4', 'old', 'tenant', '1404-01-01'),
  stay('u3', 'omid', 'owner')
]

const people = [
  { id: 'ahmadi' },
  { id: 'rezaei' },
  { id: 'old' },
  { id: 'omid', me: true },
  { id: 'parse' },
  { id: 'novin' }
]

const ids = (chip: Parameters<typeof personMatches>[2]) =>
  filterPersons(people, stays, chip).map(person => person.id)

describe('counterparty chips of a building', () => {
  it('«همه» keeps everyone', () => {
    expect(ids('all')).toHaveLength(6)
  })

  it('«ساکنان» are the people with a stay on the residents tab, past ones too', () => {
    expect(ids('resident')).toEqual(['ahmadi', 'rezaei', 'old', 'omid'])
  })

  it('«مدیر» is the `me` person and «پیمانکاران» everyone else', () => {
    expect(ids('manager')).toEqual(['omid'])
    expect(ids('contractor')).toEqual(['parse', 'novin'])
  })

  it('counts every chip', () => {
    expect(personChipCounts(people, stays)).toEqual({
      all: 6,
      resident: 4,
      contractor: 2,
      manager: 1
    })
  })
})

describe('counterparty labels of a building', () => {
  it('names the unit and the role of a resident', () => {
    expect(personLabel({ id: 'ahmadi' }, stays, units)).toBe('ساکن · واحد ۳ · مالک')
    expect(personLabel({ id: 'rezaei' }, stays, units)).toBe('ساکن · واحد ۴ · مستأجر')
  })

  it('marks a past resident, the manager and a contractor', () => {
    expect(personLabel({ id: 'old' }, stays, units)).toBe('ساکن قبلی · سابقاً واحد ۴')
    expect(personLabel({ id: 'omid', me: true }, stays, units)).toBe(
      'من (مدیر) · ساکن · واحد ۳ · مالک'
    )
    expect(personLabel({ id: 'parse' }, stays, units)).toBe('پیمانکار')
    expect(personLabel({ id: 'solo', me: true }, [], units)).toBe('من (مدیر)')
  })

  it('maps every person by id', () => {
    expect(personLabels(people, stays, units).get('novin')).toBe('پیمانکار')
  })
})
