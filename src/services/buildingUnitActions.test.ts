import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  archiveBlocker,
  archiveUnit,
  restoreUnit,
  saveUnit,
  validateUnitForm,
  type UnitFormValues
} from './buildingUnitActions'
import { newUnit, rowToUnit } from './buildingUnits'
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
  deleteSheetRow: async () => undefined
}))

const debts = vi.hoisted(() => ({ receivables: [] as unknown[] }))

vi.mock('./receivablesCrud', () => ({ fetchReceivables: async () => debts.receivables }))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

const values: UnitFormValues = {
  number: '۱۲',
  floor: 4,
  area: 95,
  people: 2,
  parking: 1,
  storage: 1,
  monthlyCharge: 0,
  note: 'روبه‌رو'
}

const existing = [
  { id: 'a', number: '1', active: true },
  { id: 'b', number: '2', active: false }
]

beforeEach(() => {
  log.appended.length = 0
  log.updated.length = 0
})

describe('validateUnitForm', () => {
  it('needs a door number', () => {
    expect(validateUnitForm({ ...values, number: '  ' }, existing)).toBe('شمارهٔ واحد را وارد کن')
  })

  it('refuses a number another active unit has, in either digit script', () => {
    expect(validateUnitForm({ ...values, number: '۱' }, existing)).toContain('قبلاً ثبت شده')
    expect(validateUnitForm({ ...values, number: '1' }, existing)).toContain('قبلاً ثبت شده')
  })

  it('lets a unit keep its own number, and reuses the number of an archived unit', () => {
    expect(validateUnitForm({ ...values, number: '1' }, existing, 'a')).toBeNull()
    expect(validateUnitForm({ ...values, number: '2' }, existing)).toBeNull()
  })
})

describe('saveUnit', () => {
  it('a new unit gets its numbers, a placeholder owner and an open owner stay', async () => {
    await saveUnit('b1', values, null)

    const unit = rowToUnit(log.appended.find(e => e.sheet === BUILDING_UNITS_SHEET)!.row, 2)

    expect(unit).toMatchObject({
      number: '12',
      floor: 4,
      area: 95,
      people: 2,
      parking: 1,
      storage: 1,
      monthlyCharge: 0,
      note: 'روبه‌رو'
    })
    expect(log.appended.filter(e => e.sheet === COUNTERPARTIES_SHEET)).toHaveLength(1)
    expect(log.appended.filter(e => e.sheet === BUILDING_RESIDENTS_SHEET)).toHaveLength(1)
  })

  it('an existing unit is rewritten in its row and keeps its id and occupancy', async () => {
    const unit = { ...newUnit({ number: '3', occupancy: 'tenant' }), rowNumber: 6 }

    await saveUnit('b1', { ...values, number: '3', monthlyCharge: 1_500_000 }, unit)

    expect(log.updated).toHaveLength(1)
    expect(log.updated[0].rowNumber).toBe(6)
    expect(rowToUnit(log.updated[0].row, 6)).toMatchObject({
      id: unit.id,
      occupancy: 'tenant',
      monthlyCharge: 1_500_000,
      area: 95
    })
    expect(log.appended).toHaveLength(0)
  })
})

describe('archiving a unit', () => {
  const unit = { ...newUnit({ number: '3' }), rowNumber: 6 }

  const receivable = (reference: string, amount: number, paid = 0) => ({
    id: reference,
    createdAt: '',
    title: '',
    debtor: '',
    category: '',
    amount,
    borrowDate: '',
    note: '',
    payments: paid ? [{ id: 'p', amount: paid, paidAt: '2026-10-01', note: '' }] : [],
    reference
  })

  beforeEach(() => {
    debts.receivables = []
  })

  it('names why a unit with an open balance or credit cannot be archived', () => {
    expect(archiveBlocker(unit.id, [receivable(`charge:${unit.id}:1405-07`, 100)])).toContain(
      'بدهی'
    )
    expect(archiveBlocker(unit.id, [receivable(`credit:${unit.id}`, 50)])).toContain('اعتبار')
    expect(archiveBlocker(unit.id, [receivable(`charge:${unit.id}:1405-07`, 100, 100)])).toBeNull()
    expect(archiveBlocker(unit.id, [receivable('charge:other:1405-07', 100)])).toBeNull()
  })

  it('writes the «فعال» cell as no for a settled unit and keeps the rest of the row', async () => {
    expect(await archiveUnit('b1', unit)).toBeNull()

    expect(log.updated).toHaveLength(1)
    expect(log.updated[0].rowNumber).toBe(6)
    expect(rowToUnit(log.updated[0].row, 6)).toMatchObject({
      id: unit.id,
      number: '3',
      active: false
    })
  })

  it('refuses without writing when the unit still owes', async () => {
    debts.receivables = [receivable(`charge:${unit.id}:1405-07`, 100)]

    expect(await archiveUnit('b1', unit)).toContain('بدهی')
    expect(log.updated).toHaveLength(0)
  })

  it('restores a unit, unless another active unit took its door number', async () => {
    const archived = { ...unit, active: false }

    const clash = { id: 'x', number: '3', active: true }

    expect(await restoreUnit('b1', archived, [archived, clash])).toContain('قبلاً ثبت شده')
    expect(log.updated).toHaveLength(0)

    expect(await restoreUnit('b1', archived, [archived])).toBeNull()
    expect(rowToUnit(log.updated[0].row, 6)?.active).toBe(true)
  })
})
