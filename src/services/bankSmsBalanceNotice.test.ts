import { beforeEach, describe, expect, it, vi } from 'vitest'

import { confirmSmsEntry, confirmSmsTransfer, type ConfirmableSms } from './bankSmsApply'
import { balanceAdjustNotice } from './bankSmsBalance'
import { updateBankSmsPrefs } from './bankSmsPrefs'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { TRANSFERS_HEADERS, TRANSFERS_SHEET } from './transfersModel'
import { WALLET_HEADERS, WALLET_SHEET } from './wallet'
import { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from './walletLedger'
import { formatSignedMoney } from '../utils/formatMoney'
import { showInfo } from '../utils/toast'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsNative', () => ({ markBankSmsHandled: vi.fn(async () => undefined) }))
vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: vi.fn(async () => 'rec-1'),
  createLinkedIncomeRecord: vi.fn(async () => 'rec-2')
}))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: vi.fn(async () => undefined)
}))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn() }))

describe('balanceAdjustNotice', () => {
  it('says nothing when the balance moved by exactly the SMS amount', () => {
    expect(balanceAdjustNotice(1000, 700, 300, 'debit', 'کارت')).toBeNull()
    expect(balanceAdjustNotice(1000, 1300, 300, 'credit', 'کارت')).toBeNull()
  })

  it('says nothing when the balance did not change', () => {
    expect(balanceAdjustNotice(1000, 1000, 300, 'debit', 'کارت')).toBeNull()
    expect(balanceAdjustNotice(1000, 1000, 0, 'credit', 'کارت')).toBeNull()
  })

  it('ignores float noise when comparing the moved balance', () => {
    expect(balanceAdjustNotice(0.1, 0.30000000000000004, 0.2, 'credit', 'کارت')).toBeNull()
  })

  it('names the account and both figures when the SMS «مانده» set the balance', () => {
    const text = balanceAdjustNotice(1000, 4200, 300, 'debit', 'کارت')

    expect(text).toBe(
      `موجودی «کارت» از ${formatSignedMoney(1000)} به ${formatSignedMoney(
        4200
      )} تنظیم شد (مانده پیامک)`
    )
  })

  it('also notes an SMS whose «مانده» disagrees in the opposite direction', () => {
    expect(balanceAdjustNotice(1000, 1100, 300, 'debit', 'کارت')).toContain('تنظیم شد')
  })

  it('writes a negative balance with the signed format, never a bare minus', () => {
    const text = balanceAdjustNotice(-500, -2000, 100, 'credit', 'کارت') ?? ''

    expect(text).toContain(formatSignedMoney(-500))
    expect(text).toContain(formatSignedMoney(-2000))
  })

  it('judges each leg of a transfer on its own', () => {
    expect(balanceAdjustNotice(1000, 700, 300, 'debit', 'مبدأ')).toBeNull()
    expect(balanceAdjustNotice(0, 900, 300, 'credit', 'مقصد')).toContain('«مقصد»')
  })
})

const ID = 'sms-notice'

function sms(
  id: string,
  accountId: string,
  direction: 'debit' | 'credit',
  balance: number | null,
  receivedAt = 1000
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

const record = { title: 'خرید', category: 'سایر', subCategory: '' }

describe('applyBalance tells the user when the SMS «مانده» set the balance', () => {
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
    setSheetAllRows(ID, TRANSFERS_SHEET, [TRANSFERS_HEADERS])
  })

  it('shows one info toast with the old and new balance', async () => {
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit', 4200), record)

    expect(showInfo).toHaveBeenCalledTimes(1)
    expect(showInfo).toHaveBeenCalledWith(
      `موجودی «کارت» از ${formatSignedMoney(1000)} به ${formatSignedMoney(
        4200
      )} تنظیم شد (مانده پیامک)`,
      7000
    )
  })

  it('shows nothing when the «مانده» equals old balance minus the amount', async () => {
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit', 700), record)

    expect(showInfo).not.toHaveBeenCalled()
  })

  it('shows nothing for an SMS without «مانده»', async () => {
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit', null), record)

    expect(showInfo).not.toHaveBeenCalled()
  })

  it('shows nothing for an older SMS, a newer «مانده» already holds it', async () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 5000, lastAppliedAt: 5000 } } })
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit', 9999, 1000), record)

    expect(showInfo).not.toHaveBeenCalled()
  })

  it('shows nothing for a late SMS applied as a plain move after a newer one', async () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 500, lastAppliedAt: 5000 } } })
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit', 9999, 1000), record)

    expect(showInfo).not.toHaveBeenCalled()
  })

  it('stays quiet for a balance-only confirm, which has its own toast', async () => {
    await confirmSmsEntry(ID, sms('s1', 'acc', 'debit', 4200), null)

    expect(showInfo).not.toHaveBeenCalled()
  })

  it('judges the two legs of a transfer separately', async () => {
    await confirmSmsTransfer(ID, sms('s1', 'acc', 'debit', 700), sms('s2', 'two', 'credit', 5000))

    expect(showInfo).toHaveBeenCalledTimes(1)
    expect(showInfo).toHaveBeenCalledWith(expect.stringContaining('«دوم»'), 7000)
  })

  it('says a transfer moved the balance by the amount instead of setting it to the «مانده»', async () => {
    await confirmSmsTransfer(ID, sms('s1', 'acc', 'debit', 700), sms('s2', 'two', 'credit', 5000))

    expect(showInfo).toHaveBeenCalledWith(
      `موجودی «دوم» بعد از انتقال ${formatSignedMoney(
        300
      )} شد، ولی «مانده» پیامک ${formatSignedMoney(5000)} است؛ تفاوت را در «گردش حساب» بررسی کن`,
      7000
    )
    expect(showInfo).not.toHaveBeenCalledWith(expect.stringContaining('تنظیم شد'), 7000)
  })

  it('stays quiet for a transfer whose balances agree with both «مانده»', async () => {
    await confirmSmsTransfer(ID, sms('s1', 'acc', 'debit', 700), sms('s2', 'two', 'credit', 300))

    expect(showInfo).not.toHaveBeenCalled()
  })
})
