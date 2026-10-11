import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLinkedExpenseRecord } from './paymentTransactions'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { createVehicleExpense } from './vehicleExpenses'
import { fetchWalletAccounts, WALLET_HEADERS, WALLET_SHEET } from './wallet'
import { fetchLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from './walletLedger'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: vi.fn(async () => 'rec-1'),
  deleteLinkedRecord: vi.fn()
}))
vi.mock('./settings', () => ({ getSettings: () => null, updateFormCategories: vi.fn() }))
vi.mock('../utils/toast', () => ({ showError: vi.fn() }))

const ID = 'vehicle-wallet'

describe('createVehicleExpense wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearStore(ID)
    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '1000']])
    setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('keeps an opted-out account on the re-created record without moving its balance', async () => {
    await createVehicleExpense(ID, {
      title: 'روغن',
      amount: 200,
      walletAccount: 'acc',
      walletApply: 'خیر'
    })

    expect(vi.mocked(createLinkedExpenseRecord).mock.calls[0][1]).toMatchObject({
      walletAccount: 'acc',
      walletApply: 'خیر'
    })
    expect((await fetchWalletAccounts(ID))[0].balance).toBe(1000)
    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({ applied: false, recordId: 'rec-1' })
  })

  it('still moves the balance for an applied account', async () => {
    await createVehicleExpense(ID, { title: 'روغن', amount: 200, walletAccount: 'acc' })

    expect((await fetchWalletAccounts(ID))[0].balance).toBe(800)
  })
})
