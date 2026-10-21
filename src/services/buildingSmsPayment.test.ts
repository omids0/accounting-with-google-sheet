import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmableSms } from './bankSmsApply'
import { UNIT_SMS_PAYMENT_NOTE } from './buildingCharges'
import { payUnitFromSms } from './buildingSmsPayment'

const calls = vi.hoisted(() => ({
  order: [] as string[],
  confirm: [] as unknown[],
  pay: [] as unknown[]
}))

vi.mock('./bankSmsApply', () => ({
  confirmSmsEntryWithId: vi.fn(async (...args: unknown[]) => {
    calls.order.push('confirm')
    calls.confirm.push(args)

    return 'rec-1'
  })
}))

const bridge = vi.hoisted(() => ({ ownCharge: vi.fn(async (_input: unknown) => true) }))

vi.mock('./buildingBridge', () => ({ bridgeOwnCharge: bridge.ownCharge }))
vi.mock('./buildingPayment', () => ({
  payUnit: vi.fn(async (...args: unknown[]) => {
    calls.order.push('pay')
    calls.pay.push(args)

    return { amount: 1_200_000, date: '2025-10-02' }
  })
}))

const entry = {
  sms: {
    id: 's1',
    sender: 'MELLAT',
    body: 'واریز:1,200,000\nحساب:6104***3210',
    receivedAt: 1_760_000_000_000
  },
  result: {
    kind: 'matched',
    accountId: 'fund',
    direction: 'credit',
    templateId: 't1',
    ref: '3210'
  },
  amount: 1_200_000,
  balance: 9_000_000
} as unknown as ConfirmableSms

beforeEach(() => {
  calls.order = []
  calls.confirm = []
  calls.pay = []
  bridge.ownCharge.mockClear()
  bridge.ownCharge.mockResolvedValue(true)
})

describe('payUnitFromSms', () => {
  it('confirms the deposit as income first, then spreads that record over the unit', async () => {
    await payUnitFromSms('sheet', entry, {
      unit: { id: 'u4', number: '4' },
      debtor: { id: 'p4', name: 'رضایی' },
      accountTitle: 'ملت صندوق'
    })

    expect(calls.order).toEqual(['confirm', 'pay'])

    const [, , record, flags] = calls.confirm[0] as [
      string,
      unknown,
      Record<string, string>,
      object
    ]

    expect(record).toEqual({
      title: 'شارژ واحد ۴ · رضایی',
      category: 'شارژ ساختمان',
      subCategory: ''
    })
    // The charge category must not become the «last category» of that bank in other workspaces.
    expect(flags).toEqual({ remember: false })

    const [sheet, input] = calls.pay[0] as [string, Record<string, unknown>]

    expect(sheet).toBe('sheet')
    expect(input).toMatchObject({
      unit: { id: 'u4', number: '4' },
      debtor: { id: 'p4', name: 'رضایی' },
      amount: 1_200_000,
      keepCredit: true,
      note: UNIT_SMS_PAYMENT_NOTE,
      accountTitle: 'ملت صندوق',
      options: { walletAccount: 'fund', linkRecordId: 'rec-1' }
    })
  })

  it('does not pay the unit when the deposit could not be recorded', async () => {
    const apply = await import('./bankSmsApply')

    vi.mocked(apply.confirmSmsEntryWithId).mockRejectedValueOnce(new Error('offline'))

    await expect(
      payUnitFromSms('sheet', entry, {
        unit: { id: 'u4', number: '4' },
        debtor: null,
        accountTitle: ''
      })
    ).rejects.toThrow('offline')
    expect(calls.pay).toHaveLength(0)
  })

  describe('Bridge B', () => {
    const own = {
      unit: { id: 'u4', number: '4' },
      debtor: { id: 'p4', name: 'من' },
      accountTitle: ''
    }

    it('bridges the own unit of the manager once per deposit, keyed by its record', async () => {
      await payUnitFromSms('sheet', entry, { ...own, bridgeOwn: true })

      expect(calls.order).toEqual(['confirm', 'pay'])
      expect(bridge.ownCharge).toHaveBeenCalledWith({
        unitNumber: '۴',
        amount: 1_200_000,
        date: '2025-10-02',
        paymentKey: 'rec-1'
      })
    })

    it('does not bridge without the tick, or when the deposit could not be recorded', async () => {
      await payUnitFromSms('sheet', entry, own)

      expect(bridge.ownCharge).not.toHaveBeenCalled()

      const apply = await import('./bankSmsApply')

      vi.mocked(apply.confirmSmsEntryWithId).mockRejectedValueOnce(new Error('offline'))
      await payUnitFromSms('sheet', entry, { ...own, bridgeOwn: true }).catch(() => undefined)

      expect(bridge.ownCharge).not.toHaveBeenCalled()
    })

    it('never fails the payment when the bridge fails', async () => {
      bridge.ownCharge.mockRejectedValueOnce(new Error('offline'))

      await expect(
        payUnitFromSms('sheet', entry, { ...own, bridgeOwn: true })
      ).resolves.toMatchObject({ amount: 1_200_000 })
    })
  })
})
