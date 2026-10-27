import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  confirmSmsEntry,
  confirmSmsEntryWithId,
  confirmSmsTransfer,
  type ConfirmableSms
} from './bankSmsApply'
import { markBankSmsHandled } from './bankSmsNative'
import { updateBankSmsPrefs } from './bankSmsPrefs'
import { createLinkedExpenseRecord } from './paymentTransactions'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { fetchWalletAccounts, WALLET_HEADERS, WALLET_SHEET } from './wallet'
import type * as WalletModule from './wallet'
import { fetchLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from './walletLedger'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsNative', () => ({ markBankSmsHandled: vi.fn(async () => undefined) }))
vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: vi.fn(async () => 'rec-1'),
  createLinkedIncomeRecord: vi.fn(async () => 'rec-2')
}))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn() }))
vi.mock('./wallet', async importOriginal => {
  const actual = await importOriginal<typeof WalletModule>()

  return { ...actual, fetchWalletAccounts: vi.fn(actual.fetchWalletAccounts) }
})

const ID = 'sms-ledger'

function sms(id: string, accountId: string, direction: 'debit' | 'credit'): ConfirmableSms {
  return {
    sms: { id, sender: '', body: '', receivedAt: 1000, source: 'live' },
    amount: 300,
    balance: null,
    result: {
      kind: 'matched',
      templateId: 't',
      accountId,
      direction,
      unit: 'rial',
      amount: 3000,
      balance: null,
      ref: ''
    }
  }
}

const record = { title: 'خرید', category: 'سایر', subCategory: '' }

describe('SMS balance moves in the ledger', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    clearStore(ID)
    setSheetAllRows(ID, WALLET_SHEET, [
      WALLET_HEADERS,
      ['acc', '', 'کارت', '1000'],
      ['two', '', 'دوم', '0']
    ])
    setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('logs a balance-only confirm as «پیامک»', async () => {
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit'), null)

    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({
      delta: -300,
      balanceAfter: 700,
      source: 'پیامک',
      title: expect.stringMatching(/ — پیامک$/),
      applied: true
    })
  })

  it('ties the confirmed record to the ledger row', async () => {
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit'), record)

    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({
      title: 'خرید',
      recordId: 'rec-1',
      source: 'پیامک'
    })
  })

  it('keeps the account on a record whose SMS a newer «مانده» already covers', async () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 2000, lastAppliedAt: 2000 } } })

    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit'), record)

    expect(vi.mocked(createLinkedExpenseRecord).mock.calls[0][1]).toMatchObject({
      walletAccount: 'acc',
      walletApply: 'خیر'
    })
    expect((await fetchWalletAccounts(ID)).find(a => a.id === 'acc')!.balance).toBe(1000)
    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({ applied: false, balanceAfter: 1000 })
  })

  it('leaves the SMS queue even when logging the opted-out record fails', async () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 2000, lastAppliedAt: 2000 } } })
    vi.mocked(fetchWalletAccounts).mockRejectedValueOnce(new Error('offline'))

    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit'), record).catch(() => undefined)

    expect(markBankSmsHandled).toHaveBeenCalledWith(['s1'])
  })

  it('hands the new record id to afterRecord once the SMS left the queue, balance moved once', async () => {
    const seen: string[] = []

    await confirmSmsEntryWithId(ID, sms('s1', 'acc', 'debit'), record, {
      afterRecord: async recordId => {
        seen.push(recordId)
        expect(markBankSmsHandled).toHaveBeenCalledWith(['s1'])
      }
    })

    expect(seen).toEqual(['rec-1'])
    expect(await fetchLedger(ID, 'acc')).toHaveLength(1)
    expect((await fetchWalletAccounts(ID)).find(a => a.id === 'acc')!.balance).toBe(700)
  })

  it('runs afterRecord before the balance step, so a balance failure cannot lose the link', async () => {
    const seen: string[] = []

    vi.mocked(fetchWalletAccounts).mockRejectedValueOnce(new Error('offline'))
    await confirmSmsEntryWithId(ID, sms('s1', 'acc', 'debit'), record, {
      afterRecord: async recordId => void seen.push(recordId)
    }).catch(() => undefined)

    expect(seen).toEqual(['rec-1'])
  })

  it('does not call afterRecord for a balance-only confirm (no record exists)', async () => {
    const afterRecord = vi.fn(async () => undefined)

    await confirmSmsEntryWithId(ID, sms('s1', 'acc', 'debit'), null, { afterRecord })
    expect(afterRecord).not.toHaveBeenCalled()
  })

  it('logs both sides of an own-account transfer', async () => {
    await confirmSmsTransfer(ID, sms('s1', 'acc', 'debit'), sms('s2', 'two', 'credit'))

    expect((await fetchLedger(ID, 'acc'))[0]).toMatchObject({ delta: -300, balanceAfter: 700 })
    expect((await fetchLedger(ID, 'two'))[0]).toMatchObject({ delta: 300, balanceAfter: 300 })
  })
})
