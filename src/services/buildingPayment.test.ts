import { beforeEach, describe, expect, it, vi } from 'vitest'

import { creditsOf } from './buildingCharges'
import { allocatePayment, allocationText, payUnit } from './buildingPayment'
import { rowToReceivable, receivableToRow } from './receivablesRow'
import type { SettleOptions } from './settleOptions'
import type { Receivable } from '../types'

const store = vi.hoisted(() => ({ rows: [] as string[][], incomes: [] as unknown[] }))

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
  createLinkedRecordWithWallet: vi.fn(
    async (_id: string, _type: string, params: unknown, options?: SettleOptions) => {
      if (options?.linkRecordId) return options.linkRecordId
      store.incomes.push(params)

      return `income-${store.incomes.length}`
    }
  ),
  deleteLinkedRecordWithWallet: async () => undefined
}))

vi.mock('./paymentTransactions', () => ({ deleteLinkedIncomeRecord: async () => undefined }))

vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

const charge = (monthKey: string, amount = 1_000_000, unitId = 'u1'): Receivable => ({
  id: `${unitId}-${monthKey}`,
  createdAt: '',
  title: `شارژ ${monthKey}`,
  debtor: 'احمدی',
  debtorId: 'p1',
  category: 'شارژ ساختمان',
  amount,
  borrowDate: `2026-${monthKey.slice(-2)}-10`,
  note: '',
  payments: [],
  reference: `charge:${unitId}:${monthKey}`
})

const options: SettleOptions = { date: '2026-10-20', walletAccount: 'a1', walletApply: 'بله' }

const unit = { id: 'u1', number: '3' }

const debtor = { id: 'p1', name: 'احمدی' }

const saved = () => store.rows.map((row, index) => rowToReceivable(row, index + 2))

beforeEach(() => {
  store.rows = []
  store.incomes = []
})

describe('allocatePayment', () => {
  const open = [charge('1405-05'), charge('1405-06'), charge('1405-07')]

  it('pays the oldest debt first and closes what it covers', () => {
    const { parts, overflow } = allocatePayment(open, 2_000_000)

    expect(parts.map(part => [part.receivable.reference, part.use, part.closes])).toEqual([
      ['charge:u1:1405-05', 1_000_000, true],
      ['charge:u1:1405-06', 1_000_000, true]
    ])
    expect(overflow).toBe(0)
  })

  it('allows a partial payment on the last one', () => {
    const { parts, overflow } = allocatePayment(open, 1_400_000)

    expect(parts.map(part => [part.use, part.closes])).toEqual([
      [1_000_000, true],
      [400_000, false]
    ])
    expect(overflow).toBe(0)
  })

  it('returns what is more than the debt as overflow', () => {
    const { parts, overflow } = allocatePayment(open, 3_500_000)

    expect(parts).toHaveLength(3)
    expect(overflow).toBe(500_000)
    expect(allocatePayment([], 700).overflow).toBe(700)
    expect(allocatePayment(open, 0).parts).toEqual([])
  })

  it('says what it settles', () => {
    expect(allocationText(allocatePayment(open, 1_400_000).parts)).toMatch(
      /^تسویه می‌کند: مرداد ✓ · شهریور \(.+ می‌ماند\)$/
    )
    expect(allocationText([])).toBe('')
  })
})

describe('payUnit', () => {
  const seed = () => {
    store.rows = [charge('1405-05'), charge('1405-06'), charge('1405-07')].map(receivableToRow)
  }

  it('writes ONE income record and a payment on each receivable it settles', async () => {
    seed()

    const result = await payUnit('b1', {
      unit,
      debtor,
      amount: 2_500_000,
      keepCredit: true,
      options,
      accountTitle: 'ملت'
    })

    expect(store.incomes).toHaveLength(1)
    expect(store.incomes[0]).toMatchObject({ amount: 2_500_000, category: 'شارژ ساختمان' })

    const rows = saved()

    expect(rows.map(row => row.payments.map(p => p.amount))).toEqual([
      [1_000_000],
      [1_000_000],
      [500_000]
    ])
    expect(rows.flatMap(row => row.payments.map(p => p.transactionRecordId))).toEqual([
      'income-1',
      'income-1',
      'income-1'
    ])
    expect(result).toMatchObject({
      amount: 2_500_000,
      applied: 2_500_000,
      credit: 0,
      remaining: 500_000,
      months: ['مرداد', 'شهریور', 'مهر'],
      accountTitle: 'ملت'
    })
  })

  it('keeps an overpayment as a credit row the next issue can spend', async () => {
    seed()

    const result = await payUnit('b1', {
      unit,
      debtor,
      amount: 3_400_000,
      keepCredit: true,
      options,
      accountTitle: 'ملت'
    })

    const rows = saved()

    expect(rows).toHaveLength(4)
    expect(creditsOf(rows)).toEqual([{ unitId: 'u1', amount: 400_000 }])
    expect(store.incomes[0]).toMatchObject({ amount: 3_400_000 })
    expect(result).toMatchObject({ applied: 3_000_000, credit: 400_000, remaining: 0 })
  })

  it('records only the debt when the credit is declined', async () => {
    seed()

    const result = await payUnit('b1', {
      unit,
      debtor,
      amount: 3_400_000,
      keepCredit: false,
      options,
      accountTitle: ''
    })

    expect(saved()).toHaveLength(3)
    expect(store.incomes[0]).toMatchObject({ amount: 3_000_000 })
    expect(result.credit).toBe(0)
  })

  it('links an existing record instead of writing another income', async () => {
    seed()

    await payUnit('b1', {
      unit,
      debtor,
      amount: 1_000_000,
      keepCredit: true,
      options: { ...options, linkRecordId: 'sms-rec' },
      accountTitle: ''
    })

    expect(store.incomes).toHaveLength(0)
    expect(saved()[0]?.payments[0]?.transactionRecordId).toBe('sms-rec')
  })

  it('refuses a payment of nothing', async () => {
    await expect(
      payUnit('b1', { unit, debtor, amount: 0, keepCredit: true, options, accountTitle: '' })
    ).rejects.toThrow()
  })
})
