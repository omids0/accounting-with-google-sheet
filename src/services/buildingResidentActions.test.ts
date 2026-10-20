import { beforeEach, describe, expect, it, vi } from 'vitest'

import { changeResident, exitResident, type ResidentContext } from './buildingResidentActions'
import { newStay, rowToStay } from './buildingResidents'
import { newUnit, rowToUnit } from './buildingUnits'
import { rowToReceivable } from './receivablesRow'
import { BUILDING_RESIDENTS_SHEET, BUILDING_UNITS_SHEET, RECEIVABLES_SHEET } from './sheetNames'
import type { Counterparty, Receivable } from '../types'

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
  deleteSheetRow: async () => undefined
}))

const activity = vi.hoisted(() => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

vi.mock('./activityLog', () => activity)

const ID = 'b1'

const person = (id: string, lastName: string): Counterparty & { rowNumber: number } => ({
  id,
  createdAt: '',
  firstName: '',
  lastName,
  birthDate: '',
  address: '',
  location: null,
  phones: [],
  accounts: [],
  note: '',
  rowNumber: 2
})

const owner = person('owner', 'نیکو')

const tenant = person('tenant', 'کاظمی')

const newTenant = person('new', 'رضایی')

const unit = {
  ...newUnit({ number: '3', floor: 1, area: 100, occupancy: 'tenant' }),
  rowNumber: 4
}

const ownerStay = {
  ...newStay({ unitId: unit.id, personId: owner.id, role: 'owner' }),
  rowNumber: 2
}

const tenantStay = {
  ...newStay({ unitId: unit.id, personId: tenant.id, role: 'tenant' }),
  rowNumber: 3
}

const debt = (reference: string, amount: number, paid = 0) => ({
  id: reference,
  createdAt: '',
  title: reference,
  debtor: 'کاظمی',
  debtorId: tenant.id,
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-10-01',
  note: '',
  payments: paid ? [{ id: 'p', amount: paid, paidAt: '2026-10-02', note: '' }] : [],
  reference,
  rowNumber: 5
})

function context(receivables: (Receivable & { rowNumber: number })[] = []): ResidentContext {
  return {
    units: [unit],
    stays: [ownerStay, tenantStay],
    persons: [owner, tenant, newTenant],
    receivables
  }
}

const incoming = { id: newTenant.id, name: 'رضایی' }

beforeEach(() => {
  log.appended.length = 0
  log.updated.length = 0
  activity.logActivity.mockClear()
})

describe('changeResident', () => {
  it('closes the open stay of the role and opens one for the new person', async () => {
    await changeResident(ID, unit.id, incoming, 'tenant', '2026-10-10', 'keep', context())

    const closed = log.updated.find(entry => entry.sheet === BUILDING_RESIDENTS_SHEET)

    expect(closed?.rowNumber).toBe(3)
    expect(rowToStay(closed!.row, 3)).toMatchObject({
      personId: tenant.id,
      to: '2026-10-10',
      active: false
    })

    const opened = log.appended.find(entry => entry.sheet === BUILDING_RESIDENTS_SHEET)

    expect(rowToStay(opened!.row, 9)).toMatchObject({
      unitId: unit.id,
      personId: newTenant.id,
      role: 'tenant',
      from: '2026-10-10',
      to: '',
      active: true
    })
  })

  it('leaves the owner stay alone when a tenant is replaced', async () => {
    await changeResident(ID, unit.id, incoming, 'tenant', '2026-10-10', 'keep', context())

    expect(log.updated.filter(entry => entry.rowNumber === 2)).toHaveLength(0)
  })

  it('does nothing when the person already holds the role', async () => {
    await changeResident(
      ID,
      unit.id,
      { id: tenant.id, name: 'کاظمی' },
      'tenant',
      '2026-10-10',
      'keep',
      context()
    )

    expect(log.updated).toHaveLength(0)
    expect(log.appended).toHaveLength(0)
  })

  it('moves a tenant into a vacant unit and marks it let', async () => {
    const vacant = { ...unit, occupancy: 'vacant' as const }

    await changeResident(ID, unit.id, incoming, 'tenant', '2026-10-10', 'keep', {
      ...context(),
      units: [vacant],
      stays: [ownerStay]
    })

    const saved = log.updated.find(entry => entry.sheet === BUILDING_UNITS_SHEET)

    expect(rowToUnit(saved!.row, 4)).toMatchObject({ occupancy: 'tenant' })
    expect(log.updated.some(entry => entry.sheet === BUILDING_RESIDENTS_SHEET)).toBe(false)
  })

  it('a new owner keeps the unit let, and without a tenant the owner lives there', async () => {
    await changeResident(ID, unit.id, incoming, 'owner', '2026-10-10', 'keep', context())

    expect(log.updated.some(entry => entry.sheet === BUILDING_UNITS_SHEET)).toBe(false)

    log.updated.length = 0
    await changeResident(ID, unit.id, incoming, 'owner', '2026-10-10', 'keep', {
      ...context(),
      stays: [ownerStay]
    })

    const saved = log.updated.find(entry => entry.sheet === BUILDING_UNITS_SHEET)

    expect(rowToUnit(saved!.row, 4)).toMatchObject({ occupancy: 'owner-resident' })
  })

  it('keep leaves the open receivables with the previous debtor', async () => {
    await changeResident(
      ID,
      unit.id,
      incoming,
      'tenant',
      '2026-10-10',
      'keep',
      context([debt('charge:' + unit.id + ':1405-07', 1_000_000)])
    )

    expect(log.updated.some(entry => entry.sheet === RECEIVABLES_SHEET)).toBe(false)
  })

  it('to-owner re-points the debtor id and name of every open receivable', async () => {
    await changeResident(
      ID,
      unit.id,
      incoming,
      'tenant',
      '2026-10-10',
      'to-owner',
      context([
        debt('charge:' + unit.id + ':1405-07', 1_000_000),
        debt('charge:' + unit.id + ':1405-06', 1_000_000, 1_000_000),
        debt('charge:other:1405-07', 5)
      ])
    )

    const written = log.updated.filter(entry => entry.sheet === RECEIVABLES_SHEET)

    // The paid month and the other unit's receivable are untouched.
    expect(written).toHaveLength(1)
    expect(rowToReceivable(written[0].row, 5)).toMatchObject({
      debtorId: owner.id,
      debtor: 'نیکو',
      amount: 1_000_000
    })
  })

  it('forgive writes the unpaid rest off with a zero-amount «بخشودگی» payment', async () => {
    await changeResident(
      ID,
      unit.id,
      incoming,
      'tenant',
      '2026-10-10',
      'forgive',
      context([debt('charge:' + unit.id + ':1405-07', 1_200_000, 500_000)])
    )

    const written = rowToReceivable(
      log.updated.find(entry => entry.sheet === RECEIVABLES_SHEET)!.row,
      5
    )

    expect(written.amount).toBe(500_000)
    expect(written.payments.at(-1)).toMatchObject({ amount: 0, paidAt: '2026-10-10' })
    expect(written.payments.at(-1)?.note).toContain('بخشودگی')
    expect(activity.logActivity).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ module: 'receivables' })
    )
  })

  it('refuses an unknown unit', async () => {
    await expect(
      changeResident(ID, 'nope', incoming, 'tenant', '2026-10-10', 'keep', context())
    ).rejects.toThrow()
  })
})

describe('exitResident', () => {
  it('closes a tenant stay with the exit date and empties the unit', async () => {
    await exitResident(ID, unit, tenantStay, '2026-11-01')

    const stay = log.updated.find(entry => entry.sheet === BUILDING_RESIDENTS_SHEET)

    expect(rowToStay(stay!.row, 3)).toMatchObject({ to: '2026-11-01', active: false })
    expect(
      rowToUnit(log.updated.find(e => e.sheet === BUILDING_UNITS_SHEET)!.row, 4)
    ).toMatchObject({ occupancy: 'vacant' })
  })

  it('an owner who lived there keeps the unit; only the occupancy changes', async () => {
    await exitResident(ID, { ...unit, occupancy: 'owner-resident' }, ownerStay, '2026-11-01')

    expect(log.updated.some(entry => entry.sheet === BUILDING_RESIDENTS_SHEET)).toBe(false)
    expect(rowToUnit(log.updated[0].row, 4)).toMatchObject({ occupancy: 'vacant' })
  })
})
