import { describe, expect, it, vi } from 'vitest'

vi.mock('./settings', () => ({ getSettings: () => ({ forms: [] }) }))
vi.mock('./sheets', () => ({
  appendRecord: vi.fn(),
  deleteRecord: vi.fn(),
  ensureFormSheet: vi.fn(),
  fetchRecords: vi.fn()
}))

const { linkedRecordValues } = await import('./paymentTransactions')

describe('linked records round their amount', () => {
  it('stores at most two decimals', () => {
    const values = linkedRecordValues({ title: 'اصلاح موجودی', amount: 1640.6000000163913 })

    expect(values.amount).toBe(1640.6)
    expect(linkedRecordValues({ title: 't', amount: 5_100_000 }).amount).toBe(5_100_000)
  })
})
