import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../../types'

const order = vi.hoisted(() => ({
  calls: [] as string[],
  errors: [] as string[],
  walletFails: null as Error | null,
  live: ''
}))

vi.mock('./buildingExpenseEntry', () => ({
  settleBuildingEntry: async () => {
    order.calls.push('building')
  }
}))
vi.mock('../../services/entryWallet', () => ({
  settleEntryWallet: async () => {
    order.calls.push('wallet')
    if (order.walletFails) throw order.walletFails
  }
}))
vi.mock('../../services/activityLog', () => ({ logRecordActivity: vi.fn() }))
vi.mock('../../services/sharedLinkPrefs', () => ({
  linkSharedSave: vi.fn(),
  takeSharedChoice: (values: unknown) => ({ values, choice: null })
}))
vi.mock('../../services/sheets', () => ({ appendRecord: vi.fn() }))
vi.mock('../../services/bankSmsRecordOf', () => ({ liveRecordOfSms: async () => order.live }))
vi.mock('../../services/vehicleExpenseActions', () => ({ createManualVehicleExpense: vi.fn() }))
vi.mock('../../utils/toast', () => ({ showError: (message: string) => order.errors.push(message) }))

const { settleSavedEntry, writeEntryRecord } = await import('./writeEntryRecord')
const { appendRecord } = await import('../../services/sheets')
const { QueueNotLeftError } = await import('../../services/bankSmsQueueError')

const form = {
  id: 'f',
  type: 'expense',
  sheetName: 'هزینه',
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true }
  ]
} as unknown as CustomForm

describe('settleSavedEntry', () => {
  beforeEach(() => {
    order.calls = []
    order.errors = []
    order.walletFails = null
    order.live = ''
    vi.mocked(appendRecord).mockClear()
  })

  it('links after the wallet and building steps, with the record id, amount and date', async () => {
    const link = vi.fn(async (record: unknown) => {
      order.calls.push('link')

      return Boolean(record)
    })

    await settleSavedEntry(
      'sid',
      form,
      { date: '1405-02-03', amount: '20,000,000', category: 'بدهی' },
      undefined,
      'rec-9',
      link
    )

    expect(order.calls).toEqual(['wallet', 'building', 'link'])
    expect(link).toHaveBeenCalledWith({ recordId: 'rec-9', amount: 20_000_000, date: '1405-02-03' })
  })

  it('still links when the wallet step fails (the record exists either way)', async () => {
    order.walletFails = new Error('wallet')

    const link = vi.fn(async () => true)

    await settleSavedEntry('sid', form, { date: '1405-02-03', amount: 5 }, undefined, 'rec-1', link)
    expect(link).toHaveBeenCalledTimes(1)
  })

  it('N5: a wallet failure says the balance was not updated', async () => {
    order.walletFails = new Error('wallet')
    await settleSavedEntry('sid', form, { date: '1405-02-03', amount: 5 }, undefined, 'rec-1')
    expect(order.errors).toEqual(['رکورد ذخیره شد ولی موجودی حساب به‌روز نشد'])
  })

  it('N5: an SMS that stayed queued after the balance moved says THAT, not «balance not updated»', async () => {
    order.walletFails = new QueueNotLeftError()
    await settleSavedEntry('sid', form, { date: '1405-02-03', amount: 5 }, undefined, 'rec-1')
    expect(order.errors).toHaveLength(1)
    expect(order.errors[0]).toContain('موجودی به‌روز شد')
    expect(order.errors[0]).toContain('پیامک از صف بیرون نرفت')
    expect(order.errors[0]).not.toContain('به‌روز نشد')
  })

  it('does nothing extra without a link step', async () => {
    await settleSavedEntry('sid', form, { date: '1405-02-03', amount: 5 }, undefined, 'rec-1')
    expect(order.calls).toEqual(['wallet', 'building'])
  })
})

describe('writeEntryRecord from an SMS that already has its record (NEW4)', () => {
  const sms = { sms: { id: 'm1' }, result: { direction: 'debit' } } as never

  beforeEach(() => {
    order.live = ''
    vi.mocked(appendRecord).mockClear()
  })

  it('writes no second record: it stops with a message naming what to do', async () => {
    order.live = 'rec-first'
    await expect(
      writeEntryRecord('sid', form, { date: '1405-02-03', amount: 5 }, null, sms)
    ).rejects.toThrow('این پیامک قبلاً یک رکورد ساخته است')
    expect(appendRecord).not.toHaveBeenCalled()
  })

  it('an SMS without a live record writes as usual', async () => {
    await writeEntryRecord('sid', form, { date: '1405-02-03', amount: 5 }, null, sms)
    expect(appendRecord).toHaveBeenCalledTimes(1)
  })

  it('a plain entry (no SMS) never asks', async () => {
    order.live = 'rec-first'
    await writeEntryRecord('sid', form, { date: '1405-02-03', amount: 5 }, null)
    expect(appendRecord).toHaveBeenCalledTimes(1)
  })
})
