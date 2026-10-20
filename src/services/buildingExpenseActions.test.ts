import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  countUnpaidExpenseShares,
  removeBuildingExpenseShares,
  syncBuildingExpense
} from './buildingExpenseActions'
import { prepareBuildingExpenseValues } from './buildingExpenseSplit'
import type * as ResidentsModule from './buildingResidents'
import * as UnitsModule from './buildingUnits'
import { rowToDang } from './dang'
import { rowToReceivable } from './receivablesRow'
import { walletEffectOf } from './recordWallet'
import { DANG_SHEET, RECEIVABLES_SHEET } from './sheetNames'

const store = vi.hoisted(() => ({ tabs: {} as Record<string, string[][]> }))

vi.mock('./sheets', () => ({
  fetchSheetRows: async (_id: string, sheet: string) => (store.tabs[sheet] ?? []).map(r => [...r]),
  appendSheetRow: async (_id: string, sheet: string, row: string[]) => {
    store.tabs[sheet] = [...(store.tabs[sheet] ?? []), row]
  },
  updateSheetRow: async (_id: string, sheet: string, rowNumber: number, row: string[]) => {
    store.tabs[sheet][rowNumber - 2] = row
  },
  deleteSheetRow: async (_id: string, sheet: string, rowNumber: number) => {
    store.tabs[sheet].splice(rowNumber - 2, 1)
  },
  ensureSheetWithHeaders: async () => undefined
}))

vi.mock('./settleRecords', () => ({
  createLinkedRecordWithWallet: async () => 'rec',
  deleteLinkedRecordWithWallet: async () => undefined
}))

vi.mock('./paymentTransactions', () => ({
  deleteLinkedIncomeRecord: async () => undefined,
  deleteLinkedExpenseRecord: async () => undefined
}))

vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

const unit = (number: string): UnitsModule.UnitWithRow => ({
  ...UnitsModule.newUnit({ number }, ''),
  rowNumber: 2,
  id: `u${number}`
})

vi.mock('./buildingUnits', async importOriginal => ({
  ...(await importOriginal<typeof UnitsModule>()),
  fetchUnits: async () => [unit('1'), unit('2')]
}))

vi.mock('./buildingResidents', async importOriginal => ({
  ...(await importOriginal<typeof ResidentsModule>()),
  fetchStays: async () =>
    ['u1', 'u2'].map((unitId, index) => ({
      id: `s${unitId}`,
      createdAt: '',
      unitId,
      personId: `p${unitId}`,
      role: 'owner' as const,
      from: '',
      to: '',
      active: true,
      rowNumber: index + 2
    }))
}))

vi.mock('./counterparties', () => ({
  fetchCounterparties: async () =>
    ['u1', 'u2'].map(unitId => ({ id: `p${unitId}`, name: `مالک ${unitId}`, rowNumber: 2 })),
  getCounterpartyFullName: (person: { name: string }) => person.name
}))

const values = (over: Record<string, string | number> = {}) => ({
  title: 'تعمیر پمپ',
  amount: 4000,
  date: '2026-10-05',
  category: 'تعمیرات',
  subCategory: 'تأسیسات',
  expenseKind: 'capital',
  payer: 'fund',
  split: JSON.stringify({ mode: 'equal', shares: { u1: 2000, u2: 2000 }, charge: true }),
  ...over
})

const shares = () =>
  (store.tabs[RECEIVABLES_SHEET] ?? []).map((row, index) => rowToReceivable(row, index + 2))

const dangs = () => (store.tabs[DANG_SHEET] ?? []).map((row, index) => rowToDang(row, index + 2))

beforeEach(() => {
  store.tabs = {}
})

describe('syncBuildingExpense: shares', () => {
  it('creates one share receivable per unit, addressed to the owner of a capital expense', async () => {
    const { touched } = await syncBuildingExpense('b1', 'r1', values())

    expect(touched).toBe(2)
    expect(
      shares().map(item => [item.reference, item.amount, item.debtorId, item.category])
    ).toEqual([
      ['share:u1:r1', 2000, 'pu1', 'شارژ ساختمان'],
      ['share:u2:r1', 2000, 'pu2', 'شارژ ساختمان']
    ])
    expect(shares()[0].title).toBe('سهم تعمیر پمپ · واحد ۱')
  })

  it('is idempotent: saving the same record again writes nothing new', async () => {
    await syncBuildingExpense('b1', 'r1', values())

    const again = await syncBuildingExpense('b1', 'r1', values())

    expect(again.touched).toBe(0)
    expect(shares()).toHaveLength(2)
  })

  it('recomputes unpaid shares on an amount edit and leaves a paid one', async () => {
    await syncBuildingExpense('b1', 'r1', values())

    // Unit 1 paid its share.
    const paid = shares()[0]

    store.tabs[RECEIVABLES_SHEET][0][8] = JSON.stringify([
      { id: 'p', amount: 2000, paidAt: '2026-10-06', note: '' }
    ])
    expect(paid.amount).toBe(2000)

    await syncBuildingExpense(
      'b1',
      'r1',
      values({
        amount: 6000,
        split: JSON.stringify({ mode: 'equal', shares: { u1: 3000, u2: 3000 }, charge: true })
      })
    )

    expect(shares().map(item => [item.reference, item.amount])).toEqual([
      ['share:u1:r1', 2000],
      ['share:u2:r1', 3000]
    ])
  })

  it('counts and removes only the unpaid shares when the record is deleted', async () => {
    await syncBuildingExpense('b1', 'r1', values())
    store.tabs[RECEIVABLES_SHEET][0][8] = JSON.stringify([
      { id: 'p', amount: 500, paidAt: '2026-10-06', note: '' }
    ])

    expect(await countUnpaidExpenseShares('b1', 'r1')).toBe(1)

    await removeBuildingExpenseShares('b1', 'r1', values())

    expect(shares().map(item => item.reference)).toEqual(['share:u1:r1'])
  })
})

describe('syncBuildingExpense: a payer other than the fund', () => {
  const pocket = (over: Record<string, string | number> = {}) =>
    values({ payer: 'manager', split: '', ...over })

  it('creates one debt to the payer and re-saving keeps it single', async () => {
    await syncBuildingExpense('b1', 'r1', pocket())
    await syncBuildingExpense('b1', 'r1', pocket())

    expect(dangs()).toHaveLength(1)
    expect(dangs()[0]).toMatchObject({
      id: 'exp-r1',
      title: 'تعمیر پمپ',
      counterparty: 'مدیر',
      amount: 4000,
      paid: false
    })
  })

  it('follows an amount edit and goes when the payer becomes the fund or the record is deleted', async () => {
    await syncBuildingExpense('b1', 'r1', pocket())
    await syncBuildingExpense('b1', 'r1', pocket({ amount: 5000 }))

    expect(dangs()[0].amount).toBe(5000)

    await syncBuildingExpense('b1', 'r1', values({ split: '' }))
    expect(dangs()).toHaveLength(0)

    await syncBuildingExpense('b1', 'r2', pocket())
    await removeBuildingExpenseShares('b1', 'r2', pocket())
    expect(dangs()).toHaveLength(0)
  })

  it('moves no wallet balance: the account is dropped before the record is written', () => {
    const entered = { ...pocket(), walletAccount: 'acc1', walletApply: 'بله' }

    expect(walletEffectOf('expense', entered)).toEqual({ accountId: 'acc1', delta: -4000 })
    expect(walletEffectOf('expense', prepareBuildingExpenseValues(entered))).toBeNull()

    const fund = { ...values(), walletAccount: 'acc1' }

    expect(walletEffectOf('expense', prepareBuildingExpenseValues(fund))).toEqual({
      accountId: 'acc1',
      delta: -4000
    })
  })
})
