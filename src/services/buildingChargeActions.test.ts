import { beforeEach, describe, expect, it, vi } from 'vitest'

import { issueCharges, removeDuplicateCharges } from './buildingChargeActions'
import { planIssue } from './buildingChargePlan'
import { creditsOf, type ChargeResident } from './buildingCharges'
import type { BuildingProfile } from './buildingTemplate'
import { newUnit, type UnitWithRow } from './buildingUnits'
import { receivableToRow, rowToReceivable } from './receivablesRow'
import type { Receivable } from '../types'

const store = vi.hoisted(() => ({ rows: [] as string[][] }))

vi.mock('./sheets', () => ({
  fetchSheetRows: async () => store.rows.map(row => [...row]),
  appendSheetRow: async (_id: string, _sheet: string, row: string[]) => {
    store.rows.push(row)
  },
  updateSheetRow: async (_id: string, _sheet: string, rowNumber: number, row: string[]) => {
    store.rows[rowNumber - 2] = row
  },
  deleteSheetRow: async (_id: string, _sheet: string, rowNumber: number) => {
    store.rows.splice(rowNumber - 2, 1)
  },
  ensureSheetWithHeaders: async () => undefined
}))

vi.mock('./settleRecords', () => ({
  createLinkedRecordWithWallet: async () => 'rec',
  deleteLinkedRecordWithWallet: async () => undefined
}))

vi.mock('./paymentTransactions', () => ({ deleteLinkedIncomeRecord: async () => undefined }))

vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

const profile: BuildingProfile = {
  name: 'نرگس',
  address: '',
  floors: 1,
  defaultCharge: 1_000_000,
  chargeMethod: 'fixed',
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'full'
}

const unit = (number: string): UnitWithRow => ({
  ...newUnit({ number }, ''),
  rowNumber: 2,
  id: `u${number}`
})

const units = [unit('1'), unit('2')]

const residents: ChargeResident[] = units.map(item => ({
  unitId: item.id,
  personId: `p-${item.id}`,
  name: `ساکن ${item.number}`,
  role: 'owner',
  current: true
}))

const credit = (unitId: string, amount: number): Receivable => ({
  id: `credit-${unitId}`,
  createdAt: '',
  title: 'اعتبار',
  debtor: 'ساکن',
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-10-01',
  note: '',
  payments: [],
  reference: `credit:${unitId}`
})

const saved = () => store.rows.map((row, index) => rowToReceivable(row, index + 2))

const plan = (monthKey: string) => {
  const receivables = saved()

  return planIssue(profile, units, residents, receivables, creditsOf(receivables), monthKey)
}

beforeEach(() => {
  store.rows = []
})

describe('issueCharges', () => {
  it('writes one receivable per unit with the due date, debtor and reference', async () => {
    const count = await issueCharges('b1', plan('1405-08'), '2026-10-30', 'یادداشت')

    expect(count).toBe(2)
    expect(saved().map(row => [row.reference, row.amount, row.debtorId, row.borrowDate])).toEqual([
      ['charge:u1:1405-08', 1_000_000, 'p-u1', '2026-10-30'],
      ['charge:u2:1405-08', 1_000_000, 'p-u2', '2026-10-30']
    ])
    expect(saved()[0]).toMatchObject({ title: 'شارژ آبان · واحد ۱', note: 'یادداشت' })
  })

  it('writes nothing the second time, even from a stale plan', async () => {
    const stale = plan('1405-08')

    await issueCharges('b1', stale, '2026-10-30', '')

    expect(await issueCharges('b1', stale, '2026-10-30', '')).toBe(0)
    expect(await issueCharges('b1', plan('1405-08'), '2026-10-30', '')).toBe(0)
    expect(saved()).toHaveLength(2)
  })

  it('applies the unit credit first: the charge is born paid from credit, the credit shrinks', async () => {
    store.rows = [credit('u1', 400_000), credit('u2', 5_000_000)].map(receivableToRow)

    await issueCharges('b1', plan('1405-08'), '2026-10-30', '')

    const rows = saved()

    const charge1 = rows.find(row => row.reference === 'charge:u1:1405-08')!
    const charge2 = rows.find(row => row.reference === 'charge:u2:1405-08')!

    expect(charge1.payments).toMatchObject([{ amount: 400_000, fromCredit: true }])
    expect(charge1.payments[0]?.transactionRecordId).toBeUndefined()
    expect(charge2.payments).toMatchObject([{ amount: 1_000_000, fromCredit: true }])
    // u1's credit is spent, u2 keeps what the charge did not use.
    expect(creditsOf(rows)).toEqual([{ unitId: 'u2', amount: 4_000_000 }])
  })
})

describe('removeDuplicateCharges', () => {
  it('two devices issuing the same month leave one set after the cleanup', async () => {
    await issueCharges('b1', plan('1405-08'), '2026-10-30', '')

    // The second device wrote its own set before it synced.
    store.rows.push(...store.rows.map(row => [...row]))

    expect(saved()).toHaveLength(4)
    expect(await removeDuplicateCharges('b1')).toBe(2)
    expect(saved().map(row => row.reference)).toEqual(['charge:u1:1405-08', 'charge:u2:1405-08'])
  })

  it('keeps a later duplicate that already received a payment', async () => {
    await issueCharges('b1', plan('1405-08'), '2026-10-30', '')

    const paid = rowToReceivable(store.rows[0]!, 2)

    store.rows.push(
      receivableToRow({
        ...paid,
        id: 'dup',
        payments: [{ id: 'p', amount: 1, paidAt: '2026-10-21', note: '' }]
      })
    )

    expect(await removeDuplicateCharges('b1')).toBe(0)
    expect(saved()).toHaveLength(3)
  })
})
