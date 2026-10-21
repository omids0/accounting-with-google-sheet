import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmableSms } from './bankSmsApply'
import { updateBankSmsPrefs } from './bankSmsPrefs'
import { confirmSmsVehicleExpense } from './bankSmsVehicle'
import type * as EntryWallet from './entryWallet'
import { WALLET_APPLY_NO } from '../components/form/fieldUtils'

const calls: string[] = []
const create = vi.fn()
const settle = vi.fn()

vi.mock('./vehicleExpenseActions', () => ({
  createManualVehicleExpense: (...args: unknown[]) => {
    calls.push('create')

    return create(...args)
  }
}))
vi.mock('./bankSmsNative', () => ({
  markBankSmsHandled: async () => void calls.push('queue')
}))
vi.mock('./activityLog', () => ({ logRecordActivity: () => void calls.push('activity') }))
vi.mock('./entryWallet', async importOriginal => ({
  ...(await importOriginal<typeof EntryWallet>()),
  settleEntryWallet: (...args: unknown[]) => {
    calls.push('settle')

    return settle(...args)
  }
}))

const sms: ConfirmableSms = {
  sms: { id: 's1', sender: '', body: '', receivedAt: 1000, source: 'live' },
  amount: 500,
  balance: null,
  result: {
    kind: 'matched',
    templateId: 't',
    accountId: 'acc',
    direction: 'debit',
    unit: 'rial',
    amount: 5000,
    balance: null,
    ref: ''
  }
}
const vehicle = {
  vehicleId: 'veh1',
  expenseType: 'سوخت',
  fuelPricePerLiter: '5000',
  mileage: '90000'
}

describe('confirmSmsVehicleExpense', () => {
  beforeEach(() => {
    localStorage.clear()
    calls.length = 0
    create.mockReset().mockResolvedValue('rec1')
    settle.mockReset().mockResolvedValue(undefined)
  })

  it('writes the expense, takes the SMS out of the queue, then settles the balance once', async () => {
    await expect(confirmSmsVehicleExpense('sheet', sms, vehicle)).resolves.toBe('rec1')

    expect(calls).toEqual(['create', 'queue', 'activity', 'settle'])
    expect(create).toHaveBeenCalledWith(
      'sheet',
      expect.objectContaining({
        ...vehicle,
        amount: 500,
        walletAccount: 'acc',
        walletApply: ''
      })
    )
    expect(settle).toHaveBeenCalledWith(
      'sheet',
      'expense',
      expect.objectContaining({ category: 'خودرو', amount: 500, walletAccount: 'acc' }),
      sms,
      'rec1'
    )
  })

  it('does not apply the balance when a newer «مانده» already includes the SMS', async () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 2000, lastAppliedAt: 2000 } } })

    await confirmSmsVehicleExpense('sheet', sms, vehicle)

    expect(create).toHaveBeenCalledWith(
      'sheet',
      expect.objectContaining({ walletApply: WALLET_APPLY_NO })
    )
  })

  it('leaves the SMS queued when the expense could not be written', async () => {
    create.mockRejectedValue(new Error('offline'))

    await expect(confirmSmsVehicleExpense('sheet', sms, vehicle)).rejects.toThrow('offline')

    expect(calls).toEqual(['create'])
  })

  it('says the record exists when only the balance step fails, never writing it twice', async () => {
    settle.mockRejectedValue(new Error('network'))

    await expect(confirmSmsVehicleExpense('sheet', sms, vehicle)).rejects.toThrow(
      'رکورد ذخیره شد ولی موجودی حساب به‌روز نشد'
    )

    expect(calls.filter(call => call === 'create')).toHaveLength(1)
    expect(calls).toContain('queue')
  })
})
