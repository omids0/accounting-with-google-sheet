import type { Occupancy } from './buildingOptions'
import { currentOwner, type StayWithRow } from '../../services/buildingResidents'
import {
  EMPTY_PERSON,
  occupancyCounts,
  type PersonInput
} from '../../services/buildingSetupActions'
import type { UnitWithRow } from '../../services/buildingUnits'
import { getCounterpartyFullName } from '../../services/counterparties'
import type { Counterparty } from '../../types'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { parseNumeric } from '../../utils/parseNumeric'

type Person = Counterparty & { rowNumber: number }

/** The fields of journey step 4 for one unit. */
export interface UnitForm {
  owner: PersonInput
  occupancy: Occupancy
  tenant: PersonInput
  area: string
  people: string
  parking: string
  storage: string
  /** The unit's own charge; null = it keeps following the building's method. */
  charge: number | null
}

const openTenant = (unit: UnitWithRow, stays: StayWithRow[]) =>
  stays.find(s => s.unitId === unit.id && s.role === 'tenant' && s.active && !s.to)

function inputOf(person: Person | null | undefined): PersonInput {
  if (!person) return EMPTY_PERSON

  return {
    // A placeholder («مالک واحد ۳») is not a name worth showing in the field.
    name: person.placeholder ? '' : getCounterpartyFullName(person),
    phone: person.phones[0]?.number ?? '',
    card: person.accounts.find(account => !account.bankName)?.accountNumber ?? ''
  }
}

export function initialUnitForm(
  unit: UnitWithRow,
  stays: StayWithRow[],
  persons: Person[]
): UnitForm {
  const byId = new Map(persons.map(person => [person.id, person]))

  const owner = currentOwner(unit.id, stays)

  const tenant = openTenant(unit, stays)

  return {
    owner: inputOf(owner && byId.get(owner.personId)),
    occupancy: unit.occupancy,
    tenant: inputOf(tenant && byId.get(tenant.personId)),
    area: unit.area ? String(unit.area) : '',
    people: unit.people ? String(unit.people) : '',
    parking: String(unit.parking),
    storage: String(unit.storage),
    charge: unit.monthlyCharge || null
  }
}

const count = (raw: string) => Math.max(0, parseNumeric(normalizeDigits(raw)))

/** The numbers to save; a charge that was never changed saves 0 (= follows the method). */
export function unitFormNumbers(form: UnitForm) {
  return {
    area: count(form.area),
    people: Math.trunc(count(form.people)),
    parking: Math.trunc(count(form.parking)),
    storage: Math.trunc(count(form.storage)),
    monthlyCharge: form.charge ?? 0
  }
}

/** A unit is complete once its owner is a real person and not the placeholder. */
export function isUnitComplete(unit: UnitWithRow, stays: StayWithRow[], persons: Person[]) {
  const owner = currentOwner(unit.id, stays)

  const person = owner && persons.find(item => item.id === owner.personId)

  return !!person && !person.placeholder
}

export function completionSummary(units: Pick<UnitWithRow, 'occupancy'>[]): string {
  const { owner, tenant, vacant } = occupancyCounts(units)

  const fa = (value: number) => value.toLocaleString('fa-IR')

  return `${fa(units.length)} واحد ثبت شد · ${fa(owner)} مالک ساکن · ${fa(tenant)} مستأجر · ${fa(
    vacant
  )} خالی`
}
