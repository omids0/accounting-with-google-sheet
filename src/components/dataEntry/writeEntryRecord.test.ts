import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../../types'

const order = vi.hoisted(() => ({ calls: [] as string[], walletFails: false }))

vi.mock('./buildingExpenseEntry', () => ({
  settleBuildingEntry: async () => {
    order.calls.push('building')
  }
}))
vi.mock('../../services/entryWallet', () => ({
  settleEntryWallet: async () => {
    order.calls.push('wallet')
    if (order.walletFails) throw new Error('wallet')
  }
}))
vi.mock('../../services/activityLog', () => ({ logRecordActivity: vi.fn() }))
vi.mock('../../services/sharedLinkPrefs', () => ({
  linkSharedSave: vi.fn(),
  takeSharedChoice: (values: unknown) => ({ values, choice: null })
}))
vi.mock('../../services/sheets', () => ({ appendRecord: vi.fn() }))
vi.mock('../../services/vehicleExpenseActions', () => ({ createManualVehicleExpense: vi.fn() }))
vi.mock('../../utils/toast', () => ({ showError: vi.fn() }))

const { settleSavedEntry } = await import('./writeEntryRecord')

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
    order.walletFails = false
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
    order.walletFails = true

    const link = vi.fn(async () => true)

    await settleSavedEntry('sid', form, { date: '1405-02-03', amount: 5 }, undefined, 'rec-1', link)
    expect(link).toHaveBeenCalledTimes(1)
  })

  it('does nothing extra without a link step', async () => {
    await settleSavedEntry('sid', form, { date: '1405-02-03', amount: 5 }, undefined, 'rec-1')
    expect(order.calls).toEqual(['wallet', 'building'])
  })
})
