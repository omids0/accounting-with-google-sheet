import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Check, InstallmentPlan } from '../types'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  checks: [] as unknown[],
  plans: [] as unknown[],
  toggleCheck: vi.fn(async (..._args: unknown[]) => ({})),
  toggleInstallment: vi.fn(async (..._args: unknown[]) => ({}))
}))

vi.mock('./dangRow', () => ({ fetchDangs: async () => [] }))
vi.mock('./dangPayments', () => ({ addDangPayment: vi.fn() }))
vi.mock('./receivablesCrud', () => ({
  fetchReceivables: async () => [],
  addReceivablePayment: vi.fn()
}))
vi.mock('./workspace', () => ({ isPersonalWorkspace: () => true }))
vi.mock('./freshRow', () => ({ refreshRowFromSheet: mocks.refresh }))
vi.mock('./checks', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchChecks: async () => mocks.checks,
  toggleCheckPaid: mocks.toggleCheck
}))
vi.mock('./installmentsCrud', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchInstallmentPlans: async () => mocks.plans,
  toggleInstallmentPayment: mocks.toggleInstallment
}))
vi.mock('./installmentsConstants', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  invalidateInstallmentsCache: vi.fn()
}))

const { attachRecordToTarget, LinkPaymentError } = await import('./linkPayment')

const check = (over: Partial<Check> = {}) =>
  ({
    id: 'c1',
    createdAt: 't',
    checkNumber: '1001',
    direction: 'paid',
    counterparty: 'علی',
    amount: 5_000_000,
    creationDate: '2026-10-01',
    dueDate: '2026-10-20',
    paid: false,
    paidAt: '',
    subCategory: '',
    rowNumber: 2,
    ...over
  } as Check & { rowNumber: number })

const plan = (paid: boolean) =>
  ({
    rowNumber: 2,
    id: 'p1',
    title: 'وام',
    amount: 1_000_000,
    count: 2,
    payments: [{ n: 1, paid, paidAt: '', dueDate: '2026-10-05', amount: 1_000_000 }]
  } as unknown as InstallmentPlan & { rowNumber: number })

const record = { recordId: 'r1', amount: 5_000_000, date: '1405-02-03' }

describe('linking a check or an instalment reads its row fresh first (N3)', () => {
  beforeEach(() => {
    mocks.refresh.mockReset().mockResolvedValue('fresh')
    mocks.toggleCheck.mockClear()
    mocks.toggleInstallment.mockClear()
    mocks.checks = [check()]
    mocks.plans = [plan(false)]
  })

  it('asks for the check row of its tab, and writes the fresh row it gets back', async () => {
    await attachRecordToTarget('checkPaid', 'sid', 'c1', record)

    expect(mocks.refresh).toHaveBeenCalledWith('sid', expect.any(String), 'c1')
    expect(mocks.toggleCheck).toHaveBeenCalledTimes(1)
  })

  it('a check deleted on another device is refused as «missing», nothing is written', async () => {
    mocks.refresh.mockResolvedValue('missing')

    const failure = attachRecordToTarget('checkPaid', 'sid', 'c1', record)

    await expect(failure).rejects.toBeInstanceOf(LinkPaymentError)
    await expect(failure).rejects.toMatchObject({ reason: 'missing' })
    expect(mocks.toggleCheck).not.toHaveBeenCalled()
  })

  it('a check passed on another device (the refresh brought its paid row) is refused as «full»', async () => {
    mocks.refresh.mockImplementation(async () => {
      mocks.checks = [check({ paid: true })]

      return 'fresh'
    })
    await expect(attachRecordToTarget('checkPaid', 'sid', 'c1', record)).rejects.toMatchObject({
      reason: 'full'
    })
    expect(mocks.toggleCheck).not.toHaveBeenCalled()
  })

  it('a check whose amount was edited elsewhere is refused, not rewritten with the old amount', async () => {
    mocks.refresh.mockImplementation(async () => {
      mocks.checks = [check({ amount: 6_000_000 })]

      return 'fresh'
    })
    await expect(attachRecordToTarget('checkPaid', 'sid', 'c1', record)).rejects.toMatchObject({
      reason: 'over'
    })
    expect(mocks.toggleCheck).not.toHaveBeenCalled()
  })

  it('an instalment paid elsewhere, or a book deleted elsewhere, is refused', async () => {
    mocks.refresh.mockImplementation(async () => {
      mocks.plans = [plan(true)]

      return 'fresh'
    })
    await expect(
      attachRecordToTarget('installment', 'sid', 'p1', record, '1')
    ).rejects.toMatchObject({ reason: 'full' })
    mocks.refresh.mockResolvedValue('missing')
    await expect(
      attachRecordToTarget('installment', 'sid', 'p1', record, '1')
    ).rejects.toMatchObject({ reason: 'missing' })
    expect(mocks.toggleInstallment).not.toHaveBeenCalled()
  })

  it('offline or slow (skipped): the local copy is used as before', async () => {
    mocks.refresh.mockResolvedValue('skipped')
    await attachRecordToTarget('installment', 'sid', 'p1', record, '1')
    expect(mocks.toggleInstallment).toHaveBeenCalledTimes(1)
  })
})
