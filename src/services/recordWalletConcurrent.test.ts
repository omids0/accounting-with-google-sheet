import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyWalletChanges, prepareWalletChanges, recordLedgerContext } from './recordWallet'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { fetchWalletAccounts, WALLET_HEADERS, WALLET_SHEET } from './wallet'
import { fetchLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from './walletLedger'

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))
vi.mock('../utils/toast', () => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn()
}))

const ID = 'record-wallet-concurrent'

const income = (amount: number) => ({ accountId: 'acc', delta: amount })
const values = { title: 'حقوق', date: '1405-07-19', amount: '65', walletAccount: 'acc' }

async function balance(): Promise<number> {
  return (await fetchWalletAccounts(ID)).find(account => account.id === 'acc')!.balance
}

describe('two balance moves at once on one account', () => {
  beforeEach(() => {
    clearStore(ID)
    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '500']])
    setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('keeps both changes and writes both history lines', async () => {
    await Promise.all([
      applyWalletChanges(ID, null, income(65), recordLedgerContext(values, 'ثبت', 'r1')),
      applyWalletChanges(ID, null, income(65), recordLedgerContext(values, 'ثبت', 'r2'))
    ])

    const ledger = await fetchLedger(ID, 'acc')

    expect(await balance()).toBe(630)
    expect(ledger).toHaveLength(2)
    expect(ledger.map(entry => entry.balanceAfter).sort()).toEqual([565, 630])
  })

  it('applies prepared writers that were both read before either wrote', async () => {
    const first = await prepareWalletChanges(
      ID,
      null,
      income(10),
      recordLedgerContext(values, 'ثبت', 'r1')
    )
    const second = await prepareWalletChanges(
      ID,
      null,
      income(20),
      recordLedgerContext(values, 'ثبت', 'r2')
    )

    await Promise.all([first(), second()])

    expect(await balance()).toBe(530)
    expect(await fetchLedger(ID, 'acc')).toHaveLength(2)
  })

  it('an account that vanished before the write is skipped and the next move still runs', async () => {
    const write = await prepareWalletChanges(
      ID,
      null,
      income(10),
      recordLedgerContext(values, 'ثبت', 'r1')
    )

    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS])
    await expect(write()).resolves.toBeUndefined()
    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '500']])
    await applyWalletChanges(ID, null, income(5), recordLedgerContext(values, 'ثبت', 'r2'))

    expect(await balance()).toBe(505)
  })
})
