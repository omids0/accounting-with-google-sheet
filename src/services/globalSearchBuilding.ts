import { currentResident, type UnitStay } from './buildingResidents'
import type { BuildingUnit } from './buildingUnits'
import { getCounterpartyFullName } from './counterparties'
import { searchText, type SearchEntry } from './globalSearch'
import { optionLabel, RESIDENT_ROLES } from '../components/buildings/buildingOptions'
import type { Counterparty } from '../types'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'

/** The units and stays of the active building, for the global search. */
export interface BuildingSearchSources {
  units: BuildingUnit[]
  stays: UnitStay[]
  counterparties: Counterparty[]
}

const fa = (value: number | string) => toPersianDigits(String(value))

/**
 * «واحد ۳» and every resident of the building (owners, tenants and past stays): searching a name,
 * a phone, a unit number or a role finds the unit; both open the unit's page.
 */
export function buildingSearchEntries(sources: BuildingSearchSources): SearchEntry[] {
  const people = new Map(sources.counterparties.map(person => [person.id, person]))

  const nameOf = (personId: string) => {
    const person = people.get(personId)

    return person ? getCounterpartyFullName(person) : ''
  }

  const units = sources.units
    .filter(unit => unit.active)
    .map<SearchEntry>(unit => {
      const resident = currentResident(unit.id, sources.stays)

      const who = resident ? nameOf(resident.personId) : ''

      return {
        group: 'units',
        id: unit.id,
        unitId: unit.id,
        title: `واحد ${fa(unit.number)}`,
        subtitle: [
          unit.floor ? `ط${fa(unit.floor)}` : '',
          unit.area ? `${fa(unit.area)} متر` : '',
          who || 'خالی'
        ]
          .filter(Boolean)
          .join(' · '),
        amount: unit.monthlyCharge || null,
        date: '',
        text: searchText('واحد', unit.number, who, unit.note),
        amounts: unit.monthlyCharge ? [unit.monthlyCharge] : []
      }
    })

  const unitNumbers = new Map(sources.units.map(unit => [unit.id, unit.number]))

  const residents = sources.stays
    .filter(stay => unitNumbers.has(stay.unitId))
    .map<SearchEntry>(stay => {
      const person = people.get(stay.personId)

      const name = nameOf(stay.personId)

      const role = optionLabel(RESIDENT_ROLES, stay.role)

      const left = !!stay.to || !stay.active

      return {
        group: 'residents',
        id: stay.id,
        unitId: stay.unitId,
        title: name || '—',
        subtitle: [
          `${role}${left ? ' سابق' : ''}`,
          `واحد ${fa(unitNumbers.get(stay.unitId) ?? '')}`,
          stay.from ? `از ${formatIsoDatePersian(stay.from)}` : ''
        ]
          .filter(Boolean)
          .join(' · '),
        amount: null,
        date: '',
        text: searchText(
          name,
          role,
          'ساکن',
          'واحد',
          unitNumbers.get(stay.unitId),
          ...(person?.phones.map(phone => phone.number) ?? [])
        ),
        amounts: []
      }
    })

  return [...units, ...residents]
}
