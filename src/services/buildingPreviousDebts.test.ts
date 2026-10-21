import { beforeEach, describe, expect, it, vi } from 'vitest'

import { newStay } from './buildingResidents'
import { placeholderOwner, savePreviousDebts } from './buildingSetupActions'
import { newUnit } from './buildingUnits'
import { rowToReceivable } from './receivablesRow'
import { RECEIVABLES_SHEET } from './sheetNames'

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

const owner = { ...placeholderOwner('3'), id: 'p1', createdAt: '', rowNumber: 2 }

function setup(occupancy: 'owner-resident' | 'tenant' | 'vacant' = 'owner-resident') {
  const unit = { ...newUnit({ number: '3', floor: 1, area: 100 }), occupancy, rowNumber: 2 }
  const stay = { ...newStay({ unitId: unit.id, personId: owner.id, role: 'owner' }), rowNumber: 2 }

  return { unit, stays: [stay] }
}

describe('previous debts', () => {
  const { unit, stays } = setup()

  const tenant = {
    ...placeholderOwner('3'),
    id: 'p2',
    firstName: 'علی',
    lastName: 'رضایی',
    placeholder: false,
    createdAt: '',
    rowNumber: 3
  }

  const tenantStay = {
    ...newStay({ unitId: unit.id, personId: 'p2', role: 'tenant' }),
    rowNumber: 3
  }

  it('writes one opening receivable per unit with an amount, to the current debtor', async () => {
    const other = { ...newUnit({ number: '4' }), rowNumber: 3 }

    const saved = await savePreviousDebts(
      ID,
      [
        { unit, amount: 2_400_000 },
        { unit: other, amount: 0 }
      ],
      { stays: [...stays, tenantStay], persons: [owner, tenant], receivables: [] }
    )

    expect(saved).toBe(1)

    const rows = rowsOf(RECEIVABLES_SHEET)

    expect(rows).toHaveLength(1)
    expect(rowToReceivable(rows[0], 2)).toMatchObject({
      title: 'بدهی قبلی · واحد ۳',
      debtor: 'علی رضایی',
      debtorId: 'p2',
      category: 'شارژ ساختمان',
      amount: 2_400_000,
      reference: `opening:${unit.id}`
    })
  })

  it('addresses a unit with no tenant to its owner', async () => {
    await savePreviousDebts(ID, [{ unit, amount: 800_000 }], {
      stays,
      persons: [owner],
      receivables: []
    })

    expect(rowToReceivable(rowsOf(RECEIVABLES_SHEET)[0], 2)).toMatchObject({
      debtorId: 'p1',
      debtor: 'مالک واحد ۳'
    })
  })

  it('updates an unpaid opening debt instead of creating a second one', async () => {
    const existing = {
      ...rowToReceivable(
        [
          'r1',
          '',
          'بدهی قبلی · واحد ۳',
          'مالک واحد ۳',
          'شارژ ساختمان',
          '500000',
          '',
          '',
          '[]',
          '',
          '',
          `opening:${unit.id}`,
          'p1'
        ],
        2
      )
    }

    const saved = await savePreviousDebts(ID, [{ unit, amount: 900_000 }], {
      stays,
      persons: [owner],
      receivables: [existing]
    })

    expect(saved).toBe(1)
    expect(rowsOf(RECEIVABLES_SHEET)).toHaveLength(0)
    expect(rowToReceivable(log.updated[0].row, 2).amount).toBe(900_000)
  })

  it('leaves a debt that already has a payment alone', async () => {
    const paid = rowToReceivable(
      [
        'r1',
        '',
        't',
        'x',
        'شارژ ساختمان',
        '500000',
        '',
        '',
        JSON.stringify([{ id: 'a', amount: 100000, paidAt: '', note: '' }]),
        '',
        '',
        `opening:${unit.id}`,
        'p1'
      ],
      2
    )

    const saved = await savePreviousDebts(ID, [{ unit, amount: 900_000 }], {
      stays,
      persons: [owner],
      receivables: [paid]
    })

    expect(saved).toBe(0)
    expect(log.updated).toHaveLength(0)
  })
})
