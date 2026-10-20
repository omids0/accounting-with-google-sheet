import { beforeEach, describe, expect, it, vi } from 'vitest'

import { newStay, rowToStay, stayToRow } from './buildingResidents'
import {
  applyPersonInput,
  completeUnit,
  createUnitsWithOwners,
  EMPTY_PERSON,
  occupancyCounts,
  placeholderOwner,
  splitName
} from './buildingSetupActions'
import { newUnit, rowToUnit, unitToRow } from './buildingUnits'
import { rowToCounterparty } from './counterparties'
import { BUILDING_RESIDENTS_SHEET, BUILDING_UNITS_SHEET, COUNTERPARTIES_SHEET } from './sheetNames'

const log = vi.hoisted(() => ({
  appended: [] as { sheet: string; row: string[] }[],
  updated: [] as { sheet: string; rowNumber: number; row: string[] }[]
}))

vi.mock('./sheets', () => ({
  appendSheetRow: async (_id: string, sheet: string, row: string[]) => {
    log.appended.push({ sheet, row })
  },
  updateSheetRow: async (_id: string, sheet: string, rowNumber: number, row: string[]) => {
    log.updated.push({ sheet, rowNumber, row })
  },
  ensureSheetWithHeaders: async () => undefined,
  fetchSheetRows: async () => [],
  deleteSheetRow: async () => undefined,
  replaceSheetDataRows: async () => undefined
}))

vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

const rowsOf = (sheet: string) =>
  log.appended.filter(entry => entry.sheet === sheet).map(e => e.row)

const ID = 'b1'

beforeEach(() => {
  log.appended.length = 0
  log.updated.length = 0
})

describe('placeholder owners', () => {
  it('names the owner after the unit and flags the person', () => {
    expect(placeholderOwner('3')).toMatchObject({
      firstName: 'مالک',
      lastName: 'واحد ۳',
      placeholder: true
    })
  })

  it('createUnitsWithOwners writes a unit, a placeholder owner and an open owner stay per unit', async () => {
    const units = await createUnitsWithOwners(ID, [
      { number: '1', floor: 1, area: 100 },
      { number: '2', floor: 1, area: 110 }
    ])

    expect(units).toHaveLength(2)

    const people = rowsOf(COUNTERPARTIES_SHEET).map((row, index) =>
      rowToCounterparty(row, index + 2)
    )
    const unitRows = rowsOf(BUILDING_UNITS_SHEET).map((row, index) => rowToUnit(row, index + 2))
    const stays = rowsOf(BUILDING_RESIDENTS_SHEET).map((row, index) => rowToStay(row, index + 2))

    expect(people.map(person => person?.placeholder)).toEqual([true, true])
    expect(unitRows.map(unit => [unit?.number, unit?.area, unit?.occupancy])).toEqual([
      ['1', 100, 'owner-resident'],
      ['2', 110, 'owner-resident']
    ])
    // The stay links the unit to the owner written for it.
    expect(stays.map(stay => [stay?.unitId, stay?.personId, stay?.role])).toEqual(
      units.map((unit, index) => [unit.id, people[index]?.id, 'owner'])
    )
  })
})

describe('person input', () => {
  it('splits a name into first and last name', () => {
    expect(splitName('احمدی')).toEqual({ firstName: '', lastName: 'احمدی' })
    expect(splitName(' علی  رضا احمدی ')).toEqual({ firstName: 'علی رضا', lastName: 'احمدی' })
  })

  it('completes a placeholder: name, phone with its leading zero, and the card', () => {
    const done = applyPersonInput(placeholderOwner('3'), {
      name: 'احمدی',
      phone: '۰۹۱۲۳۴۵۶۷۸۹',
      card: '6037 9975 1234 5678'
    })

    expect(done.placeholder).toBe(false)
    expect(done.lastName).toBe('احمدی')
    expect(done.phones).toEqual([{ number: '09123456789' }])
    expect(done.accounts).toEqual([{ bankName: '', accountNumber: '6037997512345678' }])
  })

  it('keeps the placeholder while no name is given', () => {
    expect(applyPersonInput(placeholderOwner('3'), EMPTY_PERSON).placeholder).toBe(true)
  })
})

const owner = { ...placeholderOwner('3'), id: 'p1', createdAt: '', rowNumber: 2 }

function setup(occupancy: 'owner-resident' | 'tenant' | 'vacant' = 'owner-resident') {
  const unit = { ...newUnit({ number: '3', floor: 1, area: 100 }), occupancy, rowNumber: 2 }
  const stay = { ...newStay({ unitId: unit.id, personId: owner.id, role: 'owner' }), rowNumber: 2 }

  return { unit, stays: [stay] }
}

describe('completeUnit', () => {
  const numbers = { area: 110, people: 3, parking: 1, storage: 0, monthlyCharge: 0 }

  it('writes the owner, the tenant with a stay, and the unit', async () => {
    const { unit, stays } = setup()

    await completeUnit(ID, {
      unit,
      stays,
      persons: [owner],
      owner: { name: 'احمدی', phone: '0912', card: '' },
      occupancy: 'tenant',
      tenant: { name: 'رضایی', phone: '0935', card: '' },
      ...numbers
    })

    // The owner row is the placeholder, completed in place.
    const completed = rowToCounterparty(log.updated[0].row, 2)

    expect(log.updated[0].sheet).toBe(COUNTERPARTIES_SHEET)
    expect(completed).toMatchObject({ id: 'p1', lastName: 'احمدی', placeholder: false })

    // A new counterparty and a tenant stay for the person who rents.
    const tenant = rowToCounterparty(rowsOf(COUNTERPARTIES_SHEET)[0], 3)
    const tenantStay = rowToStay(rowsOf(BUILDING_RESIDENTS_SHEET)[0], 3)

    expect(tenant).toMatchObject({ lastName: 'رضایی', phones: [{ number: '0935' }] })
    expect(tenantStay).toMatchObject({ unitId: unit.id, personId: tenant?.id, role: 'tenant' })

    // And the unit itself carries the numbers and the occupancy.
    const unitUpdate = log.updated.find(entry => entry.sheet === BUILDING_UNITS_SHEET)

    expect(rowToUnit(unitUpdate!.row, 2)).toMatchObject({
      area: 110,
      people: 3,
      parking: 1,
      occupancy: 'tenant',
      monthlyCharge: 0
    })
  })

  it('closes the open tenant stay when the unit is no longer let', async () => {
    const { unit, stays } = setup('tenant')

    const tenantStay = {
      ...newStay({ unitId: unit.id, personId: 'p2', role: 'tenant' }),
      rowNumber: 3
    }

    await completeUnit(ID, {
      unit,
      stays: [...stays, tenantStay],
      persons: [owner],
      owner: { name: 'احمدی', phone: '', card: '' },
      occupancy: 'vacant',
      tenant: EMPTY_PERSON,
      ...numbers
    })

    const closed = log.updated.find(entry => entry.sheet === BUILDING_RESIDENTS_SHEET)

    expect(closed?.rowNumber).toBe(3)
    expect(rowToStay(closed!.row, 3)).toMatchObject({ active: false })
    expect(rowToStay(closed!.row, 3)?.to).not.toBe('')
    expect(rowsOf(BUILDING_RESIDENTS_SHEET)).toHaveLength(0)
  })

  it('adds an owner stay when a unit has none', async () => {
    const { unit } = setup()

    await completeUnit(ID, {
      unit,
      stays: [],
      persons: [],
      owner: { name: 'نیکو', phone: '', card: '' },
      occupancy: 'owner-resident',
      tenant: EMPTY_PERSON,
      ...numbers
    })

    expect(rowsOf(COUNTERPARTIES_SHEET)).toHaveLength(1)
    expect(rowToStay(rowsOf(BUILDING_RESIDENTS_SHEET)[0], 2)).toMatchObject({ role: 'owner' })
  })
})

describe('occupancy counts', () => {
  it('counts owner-residents, tenants and vacant units', () => {
    expect(
      occupancyCounts([
        { occupancy: 'owner-resident' },
        { occupancy: 'owner-resident' },
        { occupancy: 'tenant' },
        { occupancy: 'vacant' }
      ])
    ).toEqual({ owner: 2, tenant: 1, vacant: 1 })
  })
})

describe('row helpers', () => {
  it('round-trips a unit and a stay through their sheet rows', () => {
    const unit = newUnit({ number: '12', floor: 4, area: 95, people: 2, monthlyCharge: 1_500_000 })

    expect(rowToUnit(unitToRow(unit), 2)).toMatchObject({ ...unit, rowNumber: 2 })

    const stay = newStay({ unitId: 'u', personId: 'p', role: 'tenant' })

    expect(rowToStay(stayToRow(stay), 2)).toMatchObject({ ...stay, rowNumber: 2 })
  })
})
