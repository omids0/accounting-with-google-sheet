import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  dangChipCounts,
  dangOriginRecordIds,
  dangPayLabel,
  dangSettlementCategory,
  filterDangs,
  repaymentSubCategory
} from './buildingDang'
import { dangIdForExpense } from './buildingExpenseSplit'
import { toggleDangPaid } from './dang'
import type { Dang } from '../types'

const state = vi.hoisted(() => ({
  building: true,
  linked: [] as { type: string; params: Record<string, unknown>; options: unknown }[],
  rows: [] as string[][]
}))

vi.mock('./workspace', () => ({
  getActiveWorkspaceType: () => (state.building ? 'building' : 'personal')
}))

vi.mock('./settleRecords', () => ({
  createLinkedRecordWithWallet: async (
    _id: string,
    type: string,
    params: Record<string, unknown>,
    options: unknown
  ) => {
    state.linked.push({ type, params, options })

    return 'transfer-1'
  },
  deleteLinkedRecordWithWallet: async () => undefined
}))

vi.mock('./sheets', () => ({
  updateSheetRow: async (_id: string, _sheet: string, _row: number, cells: string[]) => {
    state.rows.push(cells)
  },
  appendSheetRow: async () => undefined,
  fetchSheetRows: async () => [],
  deleteSheetRow: async () => undefined,
  ensureSheetWithHeaders: async () => undefined
}))

vi.mock('./activityLog', () => ({ logItemActivity: vi.fn() }))

const dang = (over: Partial<Dang>): Dang => ({
  id: 'd1',
  createdAt: '',
  title: 'سرویس آسانسور',
  category: 'آسانسور',
  subCategory: 'سرویس',
  counterparty: 'مدیر',
  amount: 2_400_000,
  date: '2026-10-08',
  note: '',
  paid: false,
  paidAt: '',
  ...over
})

const items = [
  dang({ id: 'a', counterparty: 'مدیر' }),
  dang({ id: 'b', counterparty: 'امید رضایی' }),
  dang({ id: 'c', counterparty: 'تأسیسات نوین' }),
  dang({ id: 'd', counterparty: 'مدیر', paid: true })
]

const names = ['مدیر', 'امید رضایی']

describe('filterDangs', () => {
  const ids = (chip: Parameters<typeof filterDangs>[1]) =>
    filterDangs(items, chip, names).map(item => item.id)

  it('«باز» and «تسویه‌شده» split by paid', () => {
    expect(ids('open')).toEqual(['a', 'b', 'c'])
    expect(ids('settled')).toEqual(['d'])
  })

  it('«به مدیر» is the open debt to the payer or a `me` person, «پیمانکار» the rest', () => {
    expect(ids('manager')).toEqual(['a', 'b'])
    expect(ids('contractor')).toEqual(['c'])
  })

  it('counts every chip', () => {
    expect(dangChipCounts(items, names)).toEqual({ open: 3, settled: 1, manager: 2, contractor: 1 })
  })

  it('treats nobody as the manager when no name is known', () => {
    expect(filterDangs(items, 'manager', [])).toEqual([])
    expect(filterDangs(items, 'contractor', [])).toHaveLength(3)
  })
})

describe('the settle button', () => {
  it('names who is paid, or just settles when nobody is named', () => {
    expect(dangPayLabel('مدیر')).toBe('پرداخت به مدیر')
    expect(dangPayLabel(' امید رضایی ')).toBe('پرداخت به امید رضایی')
    expect(dangPayLabel('  ')).toBe('تسویه')
  })
})

describe('repayment shape', () => {
  it('is a transfer «انتقال › بازپرداخت به <payer>» in a building, the debt category otherwise', () => {
    expect(dangSettlementCategory(dang({}), true)).toEqual({
      category: 'انتقال',
      subCategory: 'بازپرداخت به مدیر'
    })
    expect(repaymentSubCategory(' مدیر ')).toBe('بازپرداخت به مدیر')
    expect(dangSettlementCategory(dang({}), false)).toEqual({
      category: 'آسانسور',
      subCategory: 'سرویس'
    })
  })

  it('finds the expense records the debts came from', () => {
    expect(
      dangOriginRecordIds([{ id: dangIdForExpense('r1') }, { id: 'by-hand' }, { id: 'exp-r2' }])
    ).toEqual(['r1', 'r2'])
  })
})

describe('settling a building debt', () => {
  beforeEach(() => {
    state.building = true
    state.linked.length = 0
    state.rows.length = 0
  })

  const settle = (row = dang({ id: dangIdForExpense('r1') })) =>
    toggleDangPaid('sheet', { ...row, rowNumber: 2 }, true, {
      date: '2026-10-12',
      walletAccount: 'melat',
      walletApply: 'بله'
    })

  it('writes one outflow from the fund as a transfer and marks the debt paid', async () => {
    const paid = await settle()

    expect(state.linked).toHaveLength(1)
    expect(state.linked[0]).toMatchObject({
      type: 'expense',
      params: {
        title: 'بازپرداخت به مدیر · سرویس آسانسور',
        amount: 2_400_000,
        category: 'انتقال',
        subCategory: 'بازپرداخت به مدیر'
      },
      options: { walletAccount: 'melat', date: '2026-10-12' }
    })
    expect(paid).toMatchObject({ paid: true, transactionRecordId: 'transfer-1' })
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0][8]).toBe('بله')
  })

  it('keeps a personal debt an expense of its own category', async () => {
    state.building = false
    await settle()

    expect(state.linked[0].params).toMatchObject({ category: 'آسانسور', subCategory: 'سرویس' })
  })
})
