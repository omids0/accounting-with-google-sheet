import type { UnitStay } from '../../services/buildingResidents'
import type { BuildingUnit } from '../../services/buildingUnits'
import type { Counterparty } from '../../types'
import { toPersianDigits } from '../../utils/normalizeDigits'

/** Chips of a building's counterparties page: who the person is to the building. */
export type PersonChip = 'all' | 'resident' | 'contractor' | 'manager'

export const PERSON_CHIPS: { value: PersonChip; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'resident', label: 'ساکنان' },
  { value: 'contractor', label: 'پیمانکاران' },
  { value: 'manager', label: 'مدیر' }
]

type Person = Pick<Counterparty, 'id' | 'me'>

type Stay = Pick<UnitStay, 'unitId' | 'personId' | 'role' | 'active' | 'to'>

const isCurrent = (stay: Stay) => stay.active && !stay.to

/**
 * A person is a resident when the residents tab has a stay for them (past or present), the
 * manager when flagged `me`, and a contractor otherwise (the people the building pays).
 * The manager can be a resident too: the flag adds a chip, it takes none away.
 */
export function personMatches(person: Person, stays: Stay[], chip: PersonChip): boolean {
  const resident = stays.some(stay => stay.personId === person.id)

  switch (chip) {
    case 'resident':
      return resident
    case 'manager':
      return !!person.me
    case 'contractor':
      return !resident && !person.me
    default:
      return true
  }
}

export function filterPersons<T extends Person>(items: T[], stays: Stay[], chip: PersonChip): T[] {
  return items.filter(person => personMatches(person, stays, chip))
}

export function personChipCounts<T extends Person>(
  items: T[],
  stays: Stay[]
): Record<PersonChip, number> {
  const count = (chip: PersonChip) => filterPersons(items, stays, chip).length

  return {
    all: items.length,
    resident: count('resident'),
    contractor: count('contractor'),
    manager: count('manager')
  }
}

/** «ساکن · واحد ۳ · مالک», «ساکن قبلی · واحد ۴», «پیمانکار», «من»: one line per person. */
export function personLabel(
  person: Person,
  stays: Stay[],
  units: Pick<BuildingUnit, 'id' | 'number'>[]
): string {
  const own = stays.filter(stay => stay.personId === person.id)

  const parts = own.map(stay => {
    const number = toPersianDigits(units.find(unit => unit.id === stay.unitId)?.number ?? '')

    const role = stay.role === 'owner' ? 'مالک' : 'مستأجر'

    return isCurrent(stay) ? `واحد ${number} · ${role}` : `سابقاً واحد ${number}`
  })

  const kind = own.some(isCurrent) ? 'ساکن' : own.length ? 'ساکن قبلی' : person.me ? '' : 'پیمانکار'

  return [person.me ? 'من (مدیر)' : '', kind, ...parts].filter(Boolean).join(' · ')
}

export function personLabels(
  persons: Person[],
  stays: Stay[],
  units: Pick<BuildingUnit, 'id' | 'number'>[]
): Map<string, string> {
  return new Map(persons.map(person => [person.id, personLabel(person, stays, units)]))
}
