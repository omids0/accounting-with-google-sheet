import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmableSms } from './bankSmsQueue'
import type * as WalletLedgerModule from './walletLedger'

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  handled: vi.fn(),
  failLedgerOn: 0,
  ledgerCalls: 0
}))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsNative', () => ({ markBankSmsHandled: mocks.handled }))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: async () => undefined
}))
vi.mock('./walletLedger', async importOriginal => {
  const original = await importOriginal<typeof WalletLedgerModule>()

  return {
    ...original,
    // The Nth append of the test fails (0 = never): a lost history row.
    appendLedgerEntries: async (...args: Parameters<typeof original.appendLedgerEntries>) => {
      mocks.ledgerCalls += 1
      if (mocks.failLedgerOn && mocks.ledgerCalls === mocks.failLedgerOn) {
        throw new Error('ledger write lost')
      }

      return original.appendLedgerEntries(...args)
    }
  }
})
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn() }))

const { confirmSmsTransfer } = await import('./bankSmsApply')
const { getBankSmsPrefs, updateBankSmsPrefs } = await import('./bankSmsPrefs')
const { SMS_TRANSFER_NOTE, smsTransferId } = await import('./bankSmsTransferRows')
const { clearStore, getSheetDataRows, setSheetAllRows } = await import('./spreadsheetStore')
const { fetchTransfers, TRANSFERS_HEADERS, TRANSFERS_SHEET } = await import('./transfers')
const { WALLET_HEADERS, WALLET_SHEET } = await import('./wallet')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET, fetchAllLedger, rowToLedgerEntry } =
  await import('./walletLedger')
const { traceDiscrepancy } = await import('./walletTrace')
const { account, input } = await import('./walletTraceFixtures')
const { setWorkspaceType } = await import('./workspace')
const { showInfo } = await import('../utils/toast')

const ID = 'sms-transfer-confirm'
const RECEIVED = new Date(2026, 6, 1, 12, 0).getTime()

function sms(
  id: string,
  accountId: string,
  direction: 'debit' | 'credit',
  balance: number | null = null,
  receivedAt = RECEIVED
): ConfirmableSms {
  return {
    sms: { id, sender: '', body: '', receivedAt, source: 'live' },
    amount: 300,
    balance,
    result: {
      kind: 'matched',
      templateId: 't',
      accountId,
      direction,
      unit: 'rial',
      amount: 3000,
      balance,
      ref: ''
    }
  }
}

const balanceOf = (accountId: string) =>
  Number(getSheetDataRows(ID, WALLET_SHEET)?.find(row => row[0] === accountId)?.[3])

const ledger = () => (getSheetDataRows(ID, WALLET_LEDGER_SHEET) ?? []).map(rowToLedgerEntry)

const transferRows = () => getSheetDataRows(ID, TRANSFERS_SHEET) ?? []

const pair = () => [sms('d1', 'acc', 'debit'), sms('c1', 'two', 'credit')] as const

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.handled.mockReset().mockResolvedValue(undefined)
  mocks.failLedgerOn = 0
  mocks.ledgerCalls = 0
  clearStore(ID)
  setSheetAllRows(ID, WALLET_SHEET, [
    WALLET_HEADERS,
    ['acc', '', 'کارت', '1000'],
    ['two', '', 'دوم', '0']
  ])
  setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  setSheetAllRows(ID, TRANSFERS_SHEET, [TRANSFERS_HEADERS])
})

describe('confirming an SMS transfer pair', () => {
  it('creates ONE transfer row and two history rows linked to it (source «transfer»)', async () => {
    await confirmSmsTransfer(ID, ...pair())

    const id = smsTransferId('d1', 'c1')
    const [transfer] = await fetchTransfers(ID)

    expect(transferRows()).toHaveLength(1)
    expect(transfer).toMatchObject({
      id,
      fromAccountId: 'acc',
      toAccountId: 'two',
      amount: 300,
      note: SMS_TRANSFER_NOTE,
      date: '2026-07-01'
    })
    expect(balanceOf('acc')).toBe(700)
    expect(balanceOf('two')).toBe(300)
    expect(
      ledger().map(entry => [entry.accountId, entry.delta, entry.source, entry.recordId])
    ).toEqual([
      ['acc', -300, 'transfer', id],
      ['two', 300, 'transfer', id]
    ])
  })

  it('takes the SMS out of the queue only after the transfer exists', async () => {
    mocks.handled.mockImplementation(async () => {
      expect(transferRows()).toHaveLength(1)
      expect(ledger()).toHaveLength(2)
    })
    await confirmSmsTransfer(ID, ...pair())

    expect(mocks.handled).toHaveBeenCalledWith(['d1', 'c1'])
  })

  it('writes nothing the second time (the same pair on another device, or a retry)', async () => {
    await confirmSmsTransfer(ID, ...pair())
    mocks.enqueue.mockClear()
    await confirmSmsTransfer(ID, ...pair())

    expect(mocks.enqueue).not.toHaveBeenCalled()
    expect(transferRows()).toHaveLength(1)
    expect(ledger()).toHaveLength(2)
    expect(balanceOf('acc')).toBe(700)
    expect(balanceOf('two')).toBe(300)
    expect(mocks.handled).toHaveBeenCalledTimes(2)
  })

  it('rolls back and leaves both SMS pending when the second leg fails', async () => {
    mocks.failLedgerOn = 2

    await expect(confirmSmsTransfer(ID, ...pair())).rejects.toThrow('انتقال ثبت نشد')

    expect(mocks.handled).not.toHaveBeenCalled()
    expect(transferRows()).toEqual([])
    expect(balanceOf('acc')).toBe(1000)
    expect(balanceOf('two')).toBe(0)
    expect(getBankSmsPrefs().balanceStates).toEqual({})
  })

  it('can be confirmed again after a failure', async () => {
    mocks.failLedgerOn = 2
    await expect(confirmSmsTransfer(ID, ...pair())).rejects.toThrow()
    mocks.failLedgerOn = 0
    await confirmSmsTransfer(ID, ...pair())

    expect(transferRows()).toHaveLength(1)
    expect(balanceOf('acc')).toBe(700)
    expect(balanceOf('two')).toBe(300)
    expect(mocks.handled).toHaveBeenCalledTimes(1)
  })

  it('says the SMS stayed queued when only the native side fails', async () => {
    mocks.handled.mockRejectedValueOnce(new Error('native'))

    await expect(confirmSmsTransfer(ID, ...pair())).rejects.toThrow('پیامک از صف بیرون نرفت')
    expect(transferRows()).toHaveLength(1)
    // The retry finds the transfer by its fixed id.
    await confirmSmsTransfer(ID, ...pair())
    expect(transferRows()).toHaveLength(1)
    expect(balanceOf('acc')).toBe(700)
  })

  it('moves the balance state of both accounts on, so an older SMS cannot wipe the transfer', async () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 100, lastAppliedAt: 200 } } })
    await confirmSmsTransfer(ID, ...pair())

    const { balanceStates } = getBankSmsPrefs()

    expect(balanceStates.acc).toEqual({ anchor: 100, lastAppliedAt: RECEIVED })
    expect(balanceStates.two).toEqual({ anchor: undefined, lastAppliedAt: RECEIVED })
  })

  it('writes «بدون اثر» for an account a newer «مانده» already holds, and leaves its balance', async () => {
    updateBankSmsPrefs({
      balanceStates: { acc: { anchor: RECEIVED + 5000, lastAppliedAt: RECEIVED + 5000 } }
    })
    await confirmSmsTransfer(ID, ...pair())

    expect(balanceOf('acc')).toBe(1000)
    expect(balanceOf('two')).toBe(300)
    expect(ledger().map(entry => [entry.accountId, entry.applied])).toEqual([
      ['acc', false],
      ['two', true]
    ])
    expect(transferRows()).toHaveLength(1)
  })

  it('tells when a balance ends up different from the «مانده» of its SMS', async () => {
    await confirmSmsTransfer(ID, sms('d1', 'acc', 'debit', 650), sms('c1', 'two', 'credit', 300))

    expect(showInfo).toHaveBeenCalledTimes(1)
    expect(showInfo).toHaveBeenCalledWith(expect.stringContaining('«کارت»'), 7000)
    // Never set to the «مانده»: the balance is the old one moved by the amount.
    expect(balanceOf('acc')).toBe(700)
  })

  it('keeps the plain balance moves in a book without «انتقال‌ها»', async () => {
    setWorkspaceType(ID, 'building')
    await confirmSmsTransfer(ID, ...pair())

    expect(transferRows()).toEqual([])
    expect(mocks.handled).toHaveBeenCalledWith(['d1', 'c1'])
    expect(balanceOf('acc')).toBe(700)
    expect(balanceOf('two')).toBe(300)
  })

  it('shows in the wallet trace as a linked transfer, not as a missing one', async () => {
    await confirmSmsTransfer(ID, ...pair())

    const transfers = await fetchTransfers(ID)
    const history = await fetchAllLedger(ID)
    const report = traceDiscrepancy({
      ...input([account('acc', 700), account('two', 300)], history, [], 1000),
      transferIds: new Set(transfers.map(item => item.id))
    })

    expect(report.findings.map(item => item.kind)).toEqual(['transfer', 'transfer'])
    expect(report.findings.every(item => item.group === 'known')).toBe(true)
    expect(report.findings.some(item => item.kind === 'orphan-ledger')).toBe(false)
  })
})
