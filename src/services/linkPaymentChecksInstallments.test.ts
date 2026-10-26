import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Check, InstallmentPlan } from '../types'

const mocks = vi.hoisted(() => ({
  checks: [] as unknown[],
  plans: [] as unknown[],
  toggleCheck: vi.fn(async (..._args: unknown[]) => ({})),
  toggleInstallment: vi.fn(async (..._args: unknown[]) => ({})),
  invalidate: vi.fn()
}))

vi.mock('./dangRow', () => ({ fetchDangs: async () => [] }))
vi.mock('./dangPayments', () => ({ addDangPayment: vi.fn() }))
vi.mock('./receivablesCrud', () => ({
  fetchReceivables: async () => [],
  addReceivablePayment: vi.fn()
}))
vi.mock('./workspace', () => ({ isPersonalWorkspace: () => true }))
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
  invalidateInstallmentsCache: mocks.invalidate
}))

const { attachRecordToTarget, linkFailureMessage, LinkPaymentError, listOpenLinkTargets } =
  await import('./linkPayment')
const { linkTargetKindFor } = await import('../utils/linkTargetKinds')

const check = (id: string, over: Partial<Check> = {}) =>
  ({
    id,
    createdAt: 't',
    checkNumber: `10${id}`,
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

const plan = (id: string, paidUpTo: number, count = 4, amount = 1_000_000) =>
  ({
    rowNumber: 2,
    id,
    createdAt: 't',
    title: `وام ${id}`,
    amount,
    count,
    dueDay: 5,
    startDate: '2026-06-05',
    note: '',
    subCategory: 'خودرو',
    payments: Array.from({ length: count }, (_, index) => ({
      n: index + 1,
      paid: index < paidUpTo,
      paidAt: '',
      dueDate: `2026-${String(index + 6).padStart(2, '0')}-05`,
      amount
    }))
  } as InstallmentPlan & { rowNumber: number })

const record = { recordId: 'rec-1', amount: 5_000_000, date: '1405-02-03' }

const linkedOptions = {
  date: '1405-02-03',
  walletAccount: '',
  walletApply: expect.any(String),
  linkRecordId: 'rec-1'
}

describe('checks', () => {
  beforeEach(() => {
    mocks.checks = [
      check('1'),
      check('2', { paid: true }),
      check('3', { direction: 'received', amount: 700_000 }),
      check('4', { amount: 800_000, subCategory: 'خانه' })
    ]
    mocks.toggleCheck.mockReset().mockResolvedValue({})
  })

  it('lists only the open checks of the record direction, with the check amount', async () => {
    const paid = await listOpenLinkTargets('checkPaid', 'sid')

    expect(paid.map(item => [item.id, item.remaining, item.category])).toEqual([
      ['1', 5_000_000, ''],
      ['4', 800_000, 'خانه']
    ])
    expect(paid[0].title).toContain('علی')
    expect(paid[0].detail).toContain('سررسید')
    expect(paid[0].children).toBeUndefined()

    const received = await listOpenLinkTargets('checkReceived', 'sid')

    expect(received.map(item => item.id)).toEqual(['3'])
  })

  it('passes the check with the record as its payment: no second record, no balance move', async () => {
    const title = await attachRecordToTarget('checkPaid', 'sid', '1', record)

    expect(mocks.toggleCheck).toHaveBeenCalledTimes(1)
    expect(mocks.toggleCheck).toHaveBeenCalledWith(
      'sid',
      expect.objectContaining({ id: '1' }),
      true,
      linkedOptions
    )
    expect(title).toContain('۱۰۱')
  })

  it('passes a received check the same way', async () => {
    await attachRecordToTarget('checkReceived', 'sid', '3', { ...record, amount: 700_000 })
    expect(mocks.toggleCheck).toHaveBeenCalledWith(
      'sid',
      expect.objectContaining({ id: '3', direction: 'received' }),
      true,
      linkedOptions
    )
  })

  it.each([
    ['a missing check', '9', record, 'پیدا نشد'],
    ['a check passed meanwhile', '2', record, 'پاس شده'],
    ['a check of the other direction', '3', record, 'نوع این چک'],
    ['a check of another amount', '4', record, 'یکی نیست']
  ])('refuses %s and writes nothing', async (_name, id, input, reason) => {
    const failure = attachRecordToTarget('checkPaid', 'sid', id, input)

    await expect(failure).rejects.toBeInstanceOf(LinkPaymentError)
    await expect(failure).rejects.toThrow(reason)
    expect(mocks.toggleCheck).not.toHaveBeenCalled()
  })

  it('tells where to link by hand, never to save again', () => {
    const kind = linkTargetKindFor('expense', 'چک')!
    const message = linkFailureMessage(kind, new LinkPaymentError('این چک همین حالا پاس شده بود.'))

    expect(message).toContain('پاس شدن چک')
    expect(message).toContain('«چک‌ها»')
    expect(message).not.toContain('از «رکوردها» پاک کن')
    expect(message).not.toContain('دوباره ذخیره')
  })
})

describe('installments', () => {
  beforeEach(() => {
    mocks.plans = [plan('a', 1), plan('b', 4), plan('c', 0, 2, 2_000_000)]
    mocks.toggleInstallment.mockReset().mockResolvedValue({})
    mocks.invalidate.mockReset()
  })

  it('lists the books with something unpaid, each with its unpaid instalments in order', async () => {
    const books = await listOpenLinkTargets('installment', 'sid')

    expect(books.map(item => item.id)).toEqual(['a', 'c'])
    expect(books[0].children?.map(child => [child.id, child.amount])).toEqual([
      ['2', 1_000_000],
      ['3', 1_000_000],
      ['4', 1_000_000]
    ])
    expect(books[0].children?.[0].title).toContain('قسط ۲ از ۴')
    expect(books[0].detail).toContain('۳')
    expect(books[0].category).toBe('خودرو')
    expect(books[1].children?.[0].amount).toBe(2_000_000)
  })

  it('pays the chosen instalment with the record as its payment', async () => {
    const title = await attachRecordToTarget(
      'installment',
      'sid',
      'a',
      { ...record, amount: 1_000_000 },
      '3'
    )

    expect(mocks.invalidate).toHaveBeenCalledWith('sid')
    expect(mocks.toggleInstallment).toHaveBeenCalledWith(
      'sid',
      expect.objectContaining({ id: 'a' }),
      2, // the index of instalment 3
      true,
      linkedOptions
    )
    expect(title).toContain('وام a')
    expect(title).toContain('۳')
  })

  it('allows an amount that differs from the instalment (bank fees): it is only flagged', async () => {
    await attachRecordToTarget('installment', 'sid', 'a', { ...record, amount: 1_050_000 }, '2')
    expect(mocks.toggleInstallment).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a missing book', 'zzz', '2', 'دفترچه قسط پیدا نشد'],
    ['an instalment already paid', 'a', '1', 'پرداخت شده'],
    ['an instalment that does not exist', 'a', '9', 'پیدا نشد'],
    ['no instalment picked', 'a', '', 'پیدا نشد']
  ])('refuses %s and writes nothing', async (_name, planId, childId, reason) => {
    const failure = attachRecordToTarget('installment', 'sid', planId, record, childId)

    await expect(failure).rejects.toBeInstanceOf(LinkPaymentError)
    await expect(failure).rejects.toThrow(reason)
    expect(mocks.toggleInstallment).not.toHaveBeenCalled()
  })

  it('refuses a record without an amount', async () => {
    await expect(
      attachRecordToTarget('installment', 'sid', 'a', { ...record, amount: 0 }, '2')
    ).rejects.toThrow('بیشتر از صفر')
  })

  it('tells where to link by hand', () => {
    const kind = linkTargetKindFor('expense', 'قسط')!

    const message = linkFailureMessage(kind, new Error('x'))

    expect(message).toContain('«اقساط»')
    // A different amount is never found by that page, so the advice says what to do instead.
    expect(message).toContain('از «رکوردها» پاک کن')
    expect(message).not.toContain('دوباره ذخیره')
  })
})
