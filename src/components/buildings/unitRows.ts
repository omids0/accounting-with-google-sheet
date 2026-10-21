import { optionLabel, RESIDENT_ROLES, type ResidentRole } from './buildingOptions'
import {
  creditsOf,
  unitBalance,
  unitCharge,
  type UnitBalance,
  type UnitCredit
} from '../../services/buildingCharges'
import { currentOwner, currentResident, type StayWithRow } from '../../services/buildingResidents'
import type { BuildingProfile } from '../../services/buildingTemplate'
import { activeUnits, type UnitWithRow } from '../../services/buildingUnits'
import { getCounterpartyFullName } from '../../services/counterparties'
import type { Counterparty, Receivable } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'

type Person = Counterparty & { rowNumber: number }

/** One unit as the list shows it: who lives there, who owns it, what it owes and costs. */
export interface UnitRowData {
  unit: UnitWithRow
  resident: { name: string; role: ResidentRole } | null
  owner: string
  balance: UnitBalance
  /** The unit's monthly charge (its own amount, or the method's, with the vacancy rule). */
  charge: number
}

const fa = (value: number) => toPersianDigits(String(value))

export function buildUnitRows(input: {
  units: UnitWithRow[]
  stays: StayWithRow[]
  persons: Person[]
  receivables: Receivable[]
  profile: BuildingProfile | null
  credits?: UnitCredit[]
  /** Which units get a row: the active ones (default), the archived ones, or both. */
  scope?: 'active' | 'archived' | 'all'
}): UnitRowData[] {
  const { units, stays, persons, receivables, profile } = input

  const credits = input.credits ?? creditsOf(receivables)

  const nameOf = (id: string | undefined) => {
    const person = persons.find(item => item.id === id)

    return person ? getCounterpartyFullName(person) : ''
  }

  const scope = input.scope ?? 'active'

  // A unit's charge is always worked out against the active units, archived ones included or not.
  const active = activeUnits(units)

  const listed = units.filter(unit => scope === 'all' || unit.active === (scope === 'active'))

  return listed.map(unit => {
    const stay = unit.occupancy === 'vacant' ? null : currentResident(unit.id, stays)

    return {
      unit,
      resident: stay ? { name: nameOf(stay.personId), role: stay.role } : null,
      owner: nameOf(currentOwner(unit.id, stays)?.personId),
      balance: unitBalance(unit.id, receivables, credits),
      charge: profile ? unitCharge(profile, unit, active) : unit.monthlyCharge
    }
  })
}

/** «موسوی · مالک», or «خالی»; a unit not lived in by its owner adds «مالک: نیکو». */
export function unitWho(row: UnitRowData): string {
  const who = row.resident
    ? `${row.resident.name} · ${optionLabel(RESIDENT_ROLES, row.resident.role)}`
    : 'خالی'

  const away = !row.resident || row.resident.role === 'tenant'

  return away && row.owner ? `${who} · مالک: ${row.owner}` : who
}

/** «ط۱ · ۱۱۰ متر · ۴ نفر · پارکینگ ۱», the part before the charge. */
export function unitPlace(unit: UnitWithRow): string {
  return [
    unit.floor ? `ط${fa(unit.floor)}` : '',
    `${fa(unit.area)} متر`,
    `${fa(unit.people)} نفر`,
    `پارکینگ ${fa(unit.parking)}`
  ]
    .filter(Boolean)
    .join(' · ')
}

/** «۳ ماه بدهکار», «سهم عمرانی», «اعتبار …» (amount appended by the caller) or the last payment. */
export function unitStatus(balance: UnitBalance): { text: string; credit: number } {
  if (balance.open > 0) {
    if (balance.months.length) {
      return {
        text: `${fa(balance.months.length)} ماه${balance.partial ? ' (ناقص)' : ''} بدهکار`,
        credit: 0
      }
    }

    return { text: balance.hasShare ? 'سهم عمرانی' : 'بدهی قبلی', credit: 0 }
  }
  if (balance.credit > 0) return { text: 'اعتبار', credit: balance.credit }

  return {
    text: balance.lastPaidAt
      ? `پرداخت ${formatIsoDatePersian(balance.lastPaidAt)}${
          balance.lastPaidViaSms ? ' از پیامک' : ''
        }`
      : '',
    credit: 0
  }
}

/** «واحد ۳ · خالی · بدهکار ۵٬۵۰۰٬۰۰۰ تومان»: the debt in words, never with a minus sign. */
export function pickUnitLabel(row: UnitRowData): string {
  return [
    `واحد ${toPersianDigits(row.unit.number)}`,
    row.resident?.name || 'خالی',
    row.balance.open > 0 ? `بدهکار ${formatMoney(row.balance.open)}` : ''
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Debtors first, the largest debt on top, then the rest by door number. */
export function debtorsFirst(rows: UnitRowData[]): UnitRowData[] {
  const owes = (row: UnitRowData) => row.balance.open

  return [...rows].sort((a, b) => owes(b) - owes(a))
}
