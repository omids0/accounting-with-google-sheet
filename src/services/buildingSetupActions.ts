import type { QuickUnitDraft } from './buildingQuickUnits'
import {
  createStays,
  currentOwner,
  currentResident,
  newStay,
  updateStay,
  type StayWithRow
} from './buildingResidents'
import {
  createUnits,
  newUnit,
  updateUnit,
  type BuildingUnit,
  type UnitWithRow
} from './buildingUnits'
import { createCounterparty, getCounterpartyFullName, updateCounterparty } from './counterparties'
import { blankPerson, applyPersonInput, type PersonFields, type PersonInput } from './personInput'
import { createReceivable, updateReceivable } from './receivablesCrud'
import { paidAmount } from './receivablesRow'
import type { Occupancy } from '../components/buildings/buildingOptions'
import type { Counterparty, Receivable } from '../types'
import { getTodayIso } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'
import { BUILDING_CHARGE_CATEGORY } from '../utils/protectedCategories'

type Person = Counterparty & { rowNumber: number }

export { applyPersonInput, blankPerson, EMPTY_PERSON, splitName } from './personInput'
export type { PersonInput } from './personInput'

/** «مالک واحد ۳» until the owner's real name is entered; flagged so the app keeps asking. */
export function placeholderOwner(unitNumber: string): PersonFields {
  return {
    ...blankPerson(),
    firstName: 'مالک',
    lastName: `واحد ${toPersianDigits(unitNumber)}`,
    placeholder: true
  }
}

/**
 * Journey step 3: the units in one go. Every unit gets a placeholder owner («مالک واحد N») and an
 * open owner stay, so the receivables and the completion flow have somebody to address.
 */
export async function createUnitsWithOwners(
  spreadsheetId: string,
  drafts: (QuickUnitDraft & Partial<BuildingUnit>)[]
): Promise<BuildingUnit[]> {
  const units = drafts.map(draft => newUnit(draft))
  const stays = []

  for (const unit of units) {
    const owner = await createCounterparty(spreadsheetId, placeholderOwner(unit.number))

    stays.push(newStay({ unitId: unit.id, personId: owner.id, role: 'owner' }))
  }
  await createUnits(spreadsheetId, units)
  await createStays(spreadsheetId, stays)

  return units
}

/** What the completion form (journey step 4) saves for one unit. */
export interface CompleteUnitInput {
  unit: UnitWithRow
  stays: StayWithRow[]
  /** The counterparties of the building (owners and tenants live there). */
  persons: Person[]
  owner: PersonInput
  occupancy: Occupancy
  tenant: PersonInput
  area: number
  /** Head count of the unit (what a per-person charge uses). */
  people: number
  parking: number
  storage: number
  /** 0 = keep following the building's method. */
  monthlyCharge: number
}

/** Writes or updates a person for a stay and returns their id. */
async function savePerson(
  spreadsheetId: string,
  existing: Person | null | undefined,
  input: PersonInput,
  fallback: PersonFields
): Promise<string> {
  if (existing) {
    await updateCounterparty(spreadsheetId, existing.rowNumber, applyPersonInput(existing, input))

    return existing.id
  }

  return (await createCounterparty(spreadsheetId, applyPersonInput(fallback, input))).id
}

/**
 * Journey step 4 for one unit: the owner's counterparty (the placeholder, completed), the tenant
 * (a new counterparty and stay, or the open tenant stay closed when the unit is no longer let),
 * and the unit itself with its occupancy.
 */
export async function completeUnit(spreadsheetId: string, input: CompleteUnitInput) {
  const { unit, stays, persons } = input
  const byId = new Map(persons.map(person => [person.id, person]))

  const ownerStay = currentOwner(unit.id, stays)

  const ownerId = await savePerson(
    spreadsheetId,
    ownerStay && byId.get(ownerStay.personId),
    input.owner,
    placeholderOwner(unit.number)
  )

  if (!ownerStay) {
    await createStays(spreadsheetId, [
      newStay({ unitId: unit.id, personId: ownerId, role: 'owner' })
    ])
  }

  const tenantStay = stays.find(
    s => s.unitId === unit.id && s.role === 'tenant' && s.active && !s.to
  )

  if (input.occupancy === 'tenant') {
    const tenantId = await savePerson(
      spreadsheetId,
      tenantStay && byId.get(tenantStay.personId),
      input.tenant,
      {
        ...blankPerson(),
        lastName: `مستأجر واحد ${toPersianDigits(unit.number)}`,
        placeholder: true
      }
    )

    if (!tenantStay) {
      await createStays(spreadsheetId, [
        newStay({ unitId: unit.id, personId: tenantId, role: 'tenant' })
      ])
    }
  } else if (tenantStay) {
    await updateStay(spreadsheetId, tenantStay.rowNumber, {
      ...tenantStay,
      to: getTodayIso(),
      active: false
    })
  }

  await updateUnit(spreadsheetId, unit.rowNumber, {
    ...unit,
    area: input.area,
    people: input.people,
    parking: input.parking,
    storage: input.storage,
    monthlyCharge: input.monthlyCharge,
    occupancy: input.occupancy
  })
}

/** «۱۲ واحد ثبت شد · ۷ مالک ساکن · ۴ مستأجر · ۱ خالی». */
export function occupancyCounts(units: Pick<BuildingUnit, 'occupancy'>[]) {
  const count = (occupancy: Occupancy) => units.filter(u => u.occupancy === occupancy).length

  return { owner: count('owner-resident'), tenant: count('tenant'), vacant: count('vacant') }
}

export const OPENING_REFERENCE_PREFIX = 'opening:'

export interface PreviousDebtInput {
  unit: UnitWithRow
  amount: number
}

/**
 * Journey step 5: one «بدهی قبلی» receivable per unit with an amount, addressed to the unit's
 * current debtor (tenant, else owner) and keyed `opening:<unitId>`. An amount typed again for a
 * unit that already has one updates it while it is unpaid; it never creates a second.
 */
export async function savePreviousDebts(
  spreadsheetId: string,
  entries: PreviousDebtInput[],
  context: {
    stays: StayWithRow[]
    persons: Person[]
    receivables: (Receivable & { rowNumber: number })[]
  }
): Promise<number> {
  const byId = new Map(context.persons.map(person => [person.id, person]))

  let saved = 0

  for (const { unit, amount } of entries) {
    if (!(amount > 0)) continue

    const reference = `${OPENING_REFERENCE_PREFIX}${unit.id}`
    const existing = context.receivables.find(item => item.reference === reference)

    if (existing) {
      if (paidAmount(existing) === 0 && existing.amount !== amount) {
        await updateReceivable(spreadsheetId, existing.rowNumber, { ...existing, amount })
        saved += 1
      }
      continue
    }

    const stay = currentResident(unit.id, context.stays)
    const debtor = stay && byId.get(stay.personId)

    await createReceivable(spreadsheetId, {
      title: `بدهی قبلی · واحد ${toPersianDigits(unit.number)}`,
      debtor: debtor ? getCounterpartyFullName(debtor) : `واحد ${toPersianDigits(unit.number)}`,
      debtorId: debtor?.id,
      category: BUILDING_CHARGE_CATEGORY,
      subCategory: 'بدهی قبلی',
      amount,
      borrowDate: getTodayIso(),
      note: '',
      reference
    })
    saved += 1
  }

  return saved
}
