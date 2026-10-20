import type { StayWithRow } from '../../services/buildingResidents'
import type { UnitWithRow } from '../../services/buildingUnits'
import { getCounterpartyFullName } from '../../services/counterparties'
import type { Counterparty } from '../../types'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'

type Person = Counterparty & { rowNumber: number }

export type ResidentFilter = 'all' | 'owner' | 'tenant' | 'past'

export const RESIDENT_FILTERS: { value: ResidentFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'owner', label: 'مالک' },
  { value: 'tenant', label: 'مستأجر' },
  { value: 'past', label: 'قبلی‌ها' }
]

/** One stay as the residents page lists it. */
export interface ResidentRowData {
  stay: StayWithRow
  unit: UnitWithRow
  person: Person | undefined
  name: string
  phone: string
  /** «مالک و ساکن», «مالک (غیرساکن)», «مالک · واحد خالی» or «مستأجر». */
  roleText: string
  /** The row is a stay that has not ended. */
  current: boolean
}

const isCurrent = (stay: StayWithRow) => stay.active && !stay.to

export function unitRoleText(stay: StayWithRow, unit: UnitWithRow, stays: StayWithRow[]): string {
  if (stay.role === 'tenant') return 'مستأجر'
  if (unit.occupancy === 'vacant') return 'مالک · واحد خالی'

  const isLet = stays.some(s => s.unitId === unit.id && s.role === 'tenant' && isCurrent(s))

  return isLet ? 'مالک (غیرساکن)' : 'مالک و ساکن'
}

export function buildResidentRows(
  stays: StayWithRow[],
  units: UnitWithRow[],
  persons: Person[],
  filter: ResidentFilter
): ResidentRowData[] {
  return stays
    .filter(stay => (filter === 'past' ? !isCurrent(stay) : isCurrent(stay)))
    .filter(stay => filter === 'all' || filter === 'past' || stay.role === filter)
    .flatMap(stay => {
      const unit = units.find(item => item.id === stay.unitId)

      if (!unit) return []

      const person = persons.find(item => item.id === stay.personId)

      return [
        {
          stay,
          unit,
          person,
          name: person ? getCounterpartyFullName(person) : '—',
          phone: person?.phones[0]?.number ?? '',
          roleText: unitRoleText(stay, unit, stays),
          current: isCurrent(stay)
        }
      ]
    })
    .sort(
      (a, b) =>
        a.unit.number.localeCompare(b.unit.number, 'fa', { numeric: true }) ||
        a.stay.role.localeCompare(b.stay.role)
    )
}

/** How many rows each chip would show. */
export function residentCounts(
  stays: StayWithRow[],
  units: UnitWithRow[],
  persons: Person[]
): Record<ResidentFilter, number> {
  const count = (filter: ResidentFilter) => buildResidentRows(stays, units, persons, filter).length

  return { all: count('all'), owner: count('owner'), tenant: count('tenant'), past: count('past') }
}

/** «مالک و ساکن · ۰۹۱۲… · واحد ۱ · از ۱۴۰۱», or «… · از ۱۴۰۱ تا ۱۴۰۴» for a past stay. */
export function residentMeta(row: ResidentRowData): string {
  const from = `از ${formatIsoDatePersian(row.stay.from)}`

  return [
    row.roleText,
    row.phone ? toPersianDigits(row.phone) : '',
    `واحد ${toPersianDigits(row.unit.number)}`,
    row.current ? from : `${from} تا ${formatIsoDatePersian(row.stay.to)}`
  ]
    .filter(Boolean)
    .join(' · ')
}
