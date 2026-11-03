import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyWalletChanges,
  logUnappliedRecord,
  prepareWalletChanges,
  recordLedgerContext
} from './recordWallet'
import { appendSheetRow } from './sheets'
import type * as SheetsModule from './sheets'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { fetchWalletAccounts, WALLET_HEADERS, WALLET_SHEET } from './wallet'
import { fetchLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from './walletLedger'

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))
vi.mock('./sheets', async importOriginal => {
  const actual = await importOriginal<typeof SheetsModule>()

  return { ...actual, appendSheetRow: vi.fn(actual.appendSheetRow) }
})
vi.mock('../utils/toast', () => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn()
}))

const ID = 'record-wallet-ledger'

const expense = (amount: number) => ({ accountId: 'acc', delta: -amount })

const values = { title: 'ناهار', date: '1405-07-19', amount: '100', walletAccount: 'acc' }

async function balance(): Promise<number> {
  return (await fetchWalletAccounts(ID)).find(account => account.id === 'acc')!.balance
}

describe('applyWalletChanges ledger', () => {
  beforeEach(() => {
    clearStore(ID)
    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '500']])
    setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('logs a new record with the balance after it', async () => {
    await applyWalletChanges(ID, null, expense(100), recordLedgerContext(values, 'ثبت', 'r1'))

    const [entry] = await fetchLedger(ID, 'acc')

    expect(await balance()).toBe(400)
    expect(entry).toMatchObject({
      delta: -100,
      balanceAfter: 400,
      source: 'ثبت',
      title: 'ناهار',
      date: '1405-07-19',
      recordId: 'r1',
      applied: true
    })
  })

  it('undoes and logs the amount when an edit switches the balance update off', async () => {
    await applyWalletChanges(ID, expense(100), null, recordLedgerContext(values, 'ویرایش', 'r1'))

    expect(await balance()).toBe(600)
    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({ delta: 100, source: 'ویرایش' })
  })

  it('applies and logs the amount when an edit switches the balance update on', async () => {
    await applyWalletChanges(ID, null, expense(100), recordLedgerContext(values, 'ویرایش', 'r1'))

    expect(await balance()).toBe(400)
    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({ delta: -100, balanceAfter: 400 })
  })

  it('keeps the balance change when the ledger write fails', async () => {
    vi.mocked(appendSheetRow).mockRejectedValueOnce(new Error('offline'))

    await expect(
      applyWalletChanges(ID, null, expense(100), recordLedgerContext(values, 'ثبت'))
    ).resolves.toBeUndefined()
    expect(await balance()).toBe(400)
  })
})

describe('a delete refund is given once', () => {
  beforeEach(() => {
    clearStore(ID)
    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '500']])
    setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  const remove = () =>
    applyWalletChanges(ID, expense(100), null, recordLedgerContext(values, 'حذف', 'r1'))

  it('a second delete of the same record gives nothing back and logs nothing', async () => {
    await remove()
    await remove()

    expect(await balance()).toBe(600)
    expect(await fetchLedger(ID, 'acc')).toHaveLength(1)
  })

  it('refunds again when the record was saved after its earlier refund line', async () => {
    await remove()
    await applyWalletChanges(ID, null, expense(100), recordLedgerContext(values, 'ویرایش', 'r1'))
    await remove()

    expect(await balance()).toBe(600)
    expect(await fetchLedger(ID, 'acc')).toHaveLength(3)
  })

  it('another record is refunded on its own', async () => {
    await remove()
    await applyWalletChanges(ID, expense(100), null, recordLedgerContext(values, 'حذف', 'r2'))

    expect(await balance()).toBe(700)
  })

  it('writes nothing until the returned function runs, and re-reads only when asked', async () => {
    const write = await prepareWalletChanges(
      ID,
      expense(100),
      null,
      recordLedgerContext(values, 'حذف', 'r1'),
      { refresh: false }
    )

    expect(await balance()).toBe(500)
    expect(await fetchLedger(ID, 'acc')).toEqual([])
    await write()
    expect(await balance()).toBe(600)
  })
})

describe('logUnappliedRecord', () => {
  beforeEach(() => {
    clearStore(ID)
    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '500']])
    setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('logs a record that names the account but leaves its balance alone', async () => {
    const optedOut = { ...values, walletApply: 'خیر' }

    await logUnappliedRecord(ID, 'expense', optedOut, recordLedgerContext(optedOut, 'ثبت', 'r1'))

    expect(await balance()).toBe(500)
    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({
      delta: -100,
      balanceAfter: 500,
      applied: false
    })
  })

  it('logs nothing for a record that moved the balance', async () => {
    await logUnappliedRecord(ID, 'expense', values, recordLedgerContext(values, 'ثبت'))

    expect(await fetchLedger(ID, 'acc')).toEqual([])
  })
})
