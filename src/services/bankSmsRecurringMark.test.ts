import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmableSms } from './bankSmsQueue'
import type { RecurringItem } from '../types'

const mocks = vi.hoisted(() => ({ handled: vi.fn(), info: vi.fn() }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsNative', () => ({ markBankSmsHandled: mocks.handled }))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: async () => undefined,
  fetchSheetRangeFromApi: async () => [],
  fetchRecords: async () => []
}))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))
vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: async () => 'rec-1',
  createLinkedIncomeRecord: async () => 'rec-1'
}))
vi.mock('../utils/toast', () => ({
  showError: vi.fn(),
  showInfo: mocks.info,
  showSuccess: vi.fn()
}))

const { confirmSmsEntryWithId, settleSmsFromEntry } = await import('./bankSmsApply')
const { recurringToRow } = await import('./recurring')
const { fetchRecurringItems } = await import('./recurringSheet')
const { RECURRING_HEADERS } = await import('./sheetHeaders')
const { RECURRING_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')
const { WALLET_HEADERS, WALLET_SHEET } = await import('./wallet')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } = await import('./walletLedger')
const { getJalaliMonthKey } = await import('../utils/dateRange')
const { getTodayIso } = await import('../utils/jalaliDate')

const ID = 'sms-recurring-mark'
const ALLOWANCE = 38_000_000

const item = (patch: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'r1',
  createdAt: 't',
  type: 'income',
  category: 'حقوق',
  subCategory: '',
  accountId: 'acc',
  amount: ALLOWANCE,
  title: 'کمک‌هزینه',
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true,
  ...patch
})

const sms = (amount = ALLOWANCE) =>
  ({
    sms: { id: 'm1', receivedAt: Date.now(), body: 'x', sender: 'bank' },
    amount,
    balance: null,
    result: {
      kind: 'matched',
      accountId: 'acc',
      direction: 'credit',
      ref: '',
      templateId: 't',
      balance: null
    }
  } as unknown as ConfirmableSms)

const salary = { title: 'کمک‌هزینه', category: 'حقوق', subCategory: '' }
const monthKey = () => getJalaliMonthKey(getTodayIso())
const lastPosted = async () => (await fetchRecurringItems(ID)).map(row => row.lastPosted)

function seed(items: RecurringItem[]) {
  setSheetAllRows(ID, RECURRING_SHEET, [RECURRING_HEADERS, ...items.map(recurringToRow)])
}

describe('a bank SMS that pays a recurring item marks it as posted', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(ID)
    mocks.handled.mockReset().mockResolvedValue(undefined)
    mocks.info.mockClear()
    setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', 't', 'کارت', '0']])
    setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
    seed([item()])
  })

  it('card confirm: same amount, account and category marks the month and tells the user', async () => {
    await confirmSmsEntryWithId(ID, sms(), salary)

    expect(await lastPosted()).toEqual([monthKey()])
    expect(mocks.info).toHaveBeenCalledTimes(1)
  })

  it('another amount or another category leaves the item open', async () => {
    await confirmSmsEntryWithId(ID, sms(ALLOWANCE + 1), salary)
    await confirmSmsEntryWithId(ID, sms(), { ...salary, category: 'پاداش' })

    expect(await lastPosted()).toEqual([''])
    expect(mocks.info).not.toHaveBeenCalled()
  })

  it('a balance-only confirm (no record) marks nothing', async () => {
    await confirmSmsEntryWithId(ID, sms(), null)

    expect(await lastPosted()).toEqual([''])
  })

  it('an item already posted this month is not touched again', async () => {
    seed([item({ lastPosted: monthKey() })])
    await confirmSmsEntryWithId(ID, sms(), salary)

    expect(mocks.info).not.toHaveBeenCalled()
  })

  it('entry form opened from the SMS: the same marker runs', async () => {
    const effect = { accountId: 'acc', delta: ALLOWANCE }
    const context = { title: 'کمک‌هزینه', date: getTodayIso(), source: 'ثبت' as const }

    await settleSmsFromEntry(ID, sms(), effect, salary, context)

    expect(await lastPosted()).toEqual([monthKey()])
  })

  it('entry form with another category does not mark it', async () => {
    const effect = { accountId: 'acc', delta: ALLOWANCE }
    const context = { title: 'x', date: getTodayIso(), source: 'ثبت' as const }

    await settleSmsFromEntry(ID, sms(), effect, { ...salary, category: 'هدیه' }, context)

    expect(await lastPosted()).toEqual([''])
  })
})
