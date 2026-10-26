import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dang, Receivable } from '../types'

const mocks = vi.hoisted(() => ({
  dangs: [] as unknown[],
  receivables: [] as unknown[],
  addDang: vi.fn(async (..._args: unknown[]) => ({})),
  addReceivable: vi.fn(async (..._args: unknown[]) => ({}))
}))

vi.mock('./dangRow', () => ({ fetchDangs: async () => mocks.dangs }))
vi.mock('./dangPayments', () => ({ addDangPayment: mocks.addDang }))
vi.mock('./workspace', () => ({ isPersonalWorkspace: () => true }))
vi.mock('./receivablesCrud', () => ({
  fetchReceivables: async () => mocks.receivables,
  addReceivablePayment: mocks.addReceivable
}))

const { attachRecordToTarget, linkFailureMessage, LinkPaymentError, listOpenLinkTargets } =
  await import('./linkPayment')
const { DangPaymentError } = await import('./dangPaymentError')
const { linkTargetKindFor } = await import('../utils/linkTargetKinds')

const paymentOf = (id: string, amount: number) => ({ id: `p-${id}`, amount, paidAt: '1405-01-01' })

const dang = (id: string, amount: number, paid = 0, category = 'خانه') =>
  ({
    id,
    title: `بدهی ${id}`,
    category,
    amount,
    payments: paid ? [paymentOf(id, paid)] : [],
    rowNumber: 2
  } as unknown as Dang & { rowNumber: number })

const receivable = (id: string, amount: number, paid = 0) =>
  ({
    id,
    title: `طلب ${id}`,
    debtor: 'علی',
    category: 'دوستان',
    amount,
    payments: paid ? [paymentOf(id, paid)] : [],
    rowNumber: 3
  } as unknown as Receivable & { rowNumber: number })

const record = { recordId: 'rec-1', amount: 300, date: '1405-02-03' }

describe('listOpenLinkTargets', () => {
  beforeEach(() => {
    mocks.dangs = [dang('a', 1000), dang('b', 500, 500), dang('c', 800, 300, 'سفر')]
    mocks.receivables = [receivable('x', 700), receivable('y', 100, 100)]
  })

  it('lists only debts with something left, with the remaining', async () => {
    const list = await listOpenLinkTargets('dang', 'sid')

    expect(list.map(item => [item.id, item.remaining, item.category])).toEqual([
      ['a', 1000, 'خانه'],
      ['c', 500, 'سفر']
    ])
  })

  it('lists only receivables with something left', async () => {
    const list = await listOpenLinkTargets('receivable', 'sid')

    expect(list.map(item => [item.id, item.remaining])).toEqual([['x', 700]])
  })
})

describe('attachRecordToTarget', () => {
  beforeEach(() => {
    mocks.addDang.mockClear()
    mocks.addReceivable.mockClear()
    mocks.dangs = [dang('a', 1000, 500)]
    mocks.receivables = [receivable('x', 700)]
  })

  it('pays a debt with the existing record: its amount and date, no wallet, no new record', async () => {
    const title = await attachRecordToTarget('dang', 'sid', 'a', record)

    expect(title).toBe('بدهی a')
    expect(mocks.addDang).toHaveBeenCalledTimes(1)

    const [, fresh, payment, options] = mocks.addDang.mock.calls[0] as unknown as [
      string,
      Dang,
      { amount: number },
      Record<string, unknown>
    ]

    expect(fresh.id).toBe('a')
    expect(payment.amount).toBe(300)
    expect(options).toMatchObject({
      linkRecordId: 'rec-1',
      date: '1405-02-03',
      walletAccount: '',
      walletApply: 'خیر'
    })
  })

  it('reads the debt again by id, so a payment from another device is respected', async () => {
    mocks.dangs = [dang('a', 1000, 900)] // only 100 left now

    await expect(attachRecordToTarget('dang', 'sid', 'a', record)).rejects.toBeInstanceOf(
      LinkPaymentError
    )
    expect(mocks.addDang).not.toHaveBeenCalled()
  })

  it('refuses a record bigger than the remaining and a debt that is gone', async () => {
    mocks.dangs = []
    await expect(attachRecordToTarget('dang', 'sid', 'a', record)).rejects.toThrow('پیدا نشد')
    mocks.dangs = [dang('a', 1000, 500)]
    await expect(
      attachRecordToTarget('dang', 'sid', 'a', { ...record, amount: 501 })
    ).rejects.toThrow('نمی‌تواند بیشتر از مانده')
    expect(mocks.addDang).not.toHaveBeenCalled()
  })

  it('hands a receivable the freshly read row, never a stale copy', async () => {
    const fresh = receivable('x', 700, 100)

    mocks.receivables = [fresh]

    const title = await attachRecordToTarget('receivable', 'sid', 'x', record)

    expect(title).toBe('طلب x')

    const [, passed, payment, options] = mocks.addReceivable.mock.calls[0] as unknown as [
      string,
      unknown,
      { amount: number },
      Record<string, unknown>
    ]

    expect(passed).toBe(fresh)
    expect(payment.amount).toBe(300)
    expect(options.linkRecordId).toBe('rec-1')
  })

  it('refuses a receivable payment over the remaining', async () => {
    await expect(
      attachRecordToTarget('receivable', 'sid', 'x', { ...record, amount: 701 })
    ).rejects.toThrow('نمی‌تواند بیشتر از مانده')
    expect(mocks.addReceivable).not.toHaveBeenCalled()
  })
})

describe('linkFailureMessage', () => {
  const kind = linkTargetKindFor('expense', 'بدهی')!

  it('says the record stays and where to link it, never «save again»', () => {
    const text = linkFailureMessage(kind, new Error('network'))

    expect(text).toContain('رکورد ذخیره شد')
    expect(text).toContain('صفحهٔ «بدهی»')
    expect(text).not.toContain('دوباره ذخیره')
    expect(text.startsWith('رکورد')).toBe(true)
  })

  it('adds the ledger reason when there is one', () => {
    expect(linkFailureMessage(kind, new LinkPaymentError('این بدهی پیدا نشد.'))).toContain(
      'این بدهی پیدا نشد.'
    )
    expect(
      linkFailureMessage(kind, new DangPaymentError('مبلغ بیشتر است.', 'over-remaining'))
    ).toContain('مبلغ بیشتر است.')
  })
})
