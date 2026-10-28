import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsModule from '../../services/sheets'
import type { CustomForm } from '../../types'

const mocks = vi.hoisted(() => ({ hangRow: false, failRow: false, synced: true, rowCalls: 0 }))

vi.mock('../../services/sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))
vi.mock('../../services/activityLog', () => ({
  logActivity: vi.fn(),
  logItemActivity: vi.fn(),
  logRecordActivity: vi.fn()
}))
vi.mock('../../services/openingBalanceRefresh', () => ({
  refreshOpeningBalancesInBackground: vi.fn()
}))
vi.mock('../../services/walletFresh', () => ({
  refreshWalletAccounts: async () => new Set<string>()
}))
vi.mock('../../services/sessionSync', () => ({
  sessionStart: () => 0,
  waitForSessionSync: async () => mocks.synced
}))
vi.mock('../../utils/toast', () => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn()
}))
vi.mock('../../utils/sheetError', () => ({ handleSheetError: vi.fn() }))
vi.mock('../../services/sheets', async importOriginal => {
  const actual = await importOriginal<typeof SheetsModule>()

  return {
    ...actual,
    deleteRecord: (...args: Parameters<typeof actual.deleteRecord>) => {
      mocks.rowCalls += 1
      // The page dies here: the promise never settles, nothing after it runs.
      if (mocks.hangRow) return new Promise<boolean>(() => undefined)
      if (mocks.failRow) return Promise.reject(new Error('row delete failed'))

      return actual.deleteRecord(...args)
    }
  }
})

const { deleteStoredRecord } = await import('./recordsMutations')
const { enrichRecord } = await import('./recordsUtils')
const { finishInterruptedRecordDeletes, resetFinishedRecordDeletes } = await import(
  './finishInterruptedDeletes'
)
const {
  clearRecordDeletePending,
  markRecordDeletePending,
  pendingRecordDeleteIds,
  resetLiveRecordDeletes
} = await import('../../services/pendingRecordDeletes')
const { addArchiveTab } = await import('../../services/archiveRegistry')
const { resetRecordLinkHeal } = await import('../../services/recordLinkHeal')
const { buildHeaders, buildRecordRow } = await import('../../services/sheetsHeaders')
const { fetchRecords } = await import('../../services/sheets')
const { fetchInstallmentPlans, planToRow } = await import('../../services/installmentsCrud')
const { INSTALLMENTS_HEADERS, INSTALLMENTS_SHEET, invalidateInstallmentsCache } = await import(
  '../../services/installmentsConstants'
)
const { buildPayments } = await import('../../services/installmentsSchedule')
const { clearStore, getSheetAllRows, setSheetAllRows } = await import(
  '../../services/spreadsheetStore'
)
const { saveSettings } = await import('../../services/settings')
const { fetchWalletAccounts, WALLET_HEADERS, WALLET_SHEET } = await import('../../services/wallet')
const { fetchAllLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } = await import(
  '../../services/walletLedger'
)

const ID = 'test-finish-interrupted-deletes'

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true },
    { id: 'title', label: 'عنوان', type: 'text', required: false },
    { id: 'walletAccount', label: 'حساب', type: 'text', required: false },
    { id: 'walletApply', label: 'اثر بر موجودی', type: 'text', required: false }
  ]
}

const HEADERS = buildHeaders(EXPENSE.fields)

const recordRow = (id: string, amount: number, account = 'acc') =>
  buildRecordRow(HEADERS, EXPENSE.fields, id, 't', {
    date: '2026-10-05',
    amount,
    title: `خرج ${id}`,
    walletAccount: account,
    walletApply: account ? 'بله' : ''
  })

const plan = () => ({
  id: 'p1',
  createdAt: 't',
  title: 'وام خودرو',
  amount: 1_000_000,
  count: 3,
  dueDay: 5,
  startDate: '2026-07-20',
  note: '',
  subCategory: '',
  payments: buildPayments(3, 5, '2026-07-20', 1_000_000).map(payment =>
    payment.n === 2
      ? { ...payment, paid: true, paidAt: '2026-09-07', transactionRecordId: 'rec-1' }
      : payment
  )
})

async function storedRecord(id: string) {
  const record = (await fetchRecords(ID, EXPENSE)).find(item => item.id === id)

  return enrichRecord(record!, EXPENSE)
}

/** The next start: the page forgets what it was running and what it already healed. */
function restart() {
  resetLiveRecordDeletes()
  resetFinishedRecordDeletes()
  resetRecordLinkHeal()
}

/** The user confirms the delete and the page dies right after the refund, before the row goes. */
async function confirmThenDie(id: string) {
  mocks.hangRow = true
  void deleteStoredRecord({ spreadsheetId: ID, record: await storedRecord(id), form: EXPENSE })
  await vi.waitFor(() => expect(mocks.rowCalls).toBeGreaterThan(0))
  mocks.hangRow = false
  mocks.rowCalls = 0
  restart()
}

const balance = async () =>
  (await fetchWalletAccounts(ID)).find(account => account.id === 'acc')!.balance

const refunds = async () =>
  (await fetchAllLedger(ID)).filter(entry => entry.source === 'حذف' && entry.recordId === 'rec-1')

const secondInstalment = async () =>
  (await fetchInstallmentPlans(ID))[0].payments.find(payment => payment.n === 2)!

const rowIds = () => (getSheetAllRows(ID, EXPENSE.sheetName) ?? []).slice(1).map(row => row[0])

beforeEach(() => {
  localStorage.clear()
  clearStore(ID)
  invalidateInstallmentsCache(ID)
  restart()
  Object.assign(mocks, { hangRow: false, failRow: false, synced: true, rowCalls: 0 })
  saveSettings({ spreadsheetId: ID, forms: [EXPENSE] } as never)
  setSheetAllRows(ID, EXPENSE.sheetName, [
    HEADERS,
    recordRow('rec-1', 100),
    recordRow('other', 7),
    recordRow('no-account', 5, '')
  ])
  setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '400']])
  setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  setSheetAllRows(ID, INSTALLMENTS_SHEET, [INSTALLMENTS_HEADERS, planToRow(plan())])
})

describe('finishInterruptedRecordDeletes', () => {
  it('completes a delete cut off after the refund: row gone, refunded once, instalment reopened', async () => {
    await confirmThenDie('rec-1')
    expect(await balance()).toBe(500)
    expect(rowIds()).toContain('rec-1')
    expect(pendingRecordDeleteIds(ID)).toEqual(['rec-1'])
    expect(await finishInterruptedRecordDeletes(ID)).toBe(1)
    expect(rowIds()).toEqual(['other', 'no-account'])
    expect(await balance()).toBe(500)
    expect(await refunds()).toHaveLength(1)
    expect(await secondInstalment()).toMatchObject({ paid: false, paidAt: '' })
    expect(pendingRecordDeleteIds(ID)).toEqual([])
  })

  it('a delete cut off before the refund is refunded exactly once by the heal', async () => {
    // Confirmed, then the page died before the first write: only the marker survived.
    markRecordDeletePending(ID, 'rec-1')
    restart()

    expect(await finishInterruptedRecordDeletes(ID)).toBe(1)

    expect(await balance()).toBe(500)
    expect(await refunds()).toHaveLength(1)
    expect(rowIds()).toEqual(['other', 'no-account'])
    expect(await secondInstalment()).toMatchObject({ paid: false })
  })

  it('finishes a record without an account too (the marker needs no ledger line)', async () => {
    await confirmThenDie('no-account')
    expect(rowIds()).toContain('no-account')

    expect(await finishInterruptedRecordDeletes(ID)).toBe(1)

    expect(rowIds()).toEqual(['rec-1', 'other'])
    expect(await balance()).toBe(400)
  })

  it('leaves a record alone once a later edit has cleared the marker', async () => {
    await confirmThenDie('rec-1')
    clearRecordDeletePending(ID, 'rec-1')

    expect(await finishInterruptedRecordDeletes(ID)).toBe(0)
    expect(rowIds()).toContain('rec-1')
  })

  it('a record that is already gone only drops its marker', async () => {
    markRecordDeletePending(ID, 'ghost')
    restart()

    expect(await finishInterruptedRecordDeletes(ID)).toBe(0)
    expect(pendingRecordDeleteIds(ID)).toEqual([])
    expect(await balance()).toBe(400)
    expect(rowIds()).toEqual(['rec-1', 'other', 'no-account'])
  })

  it('a record moved to a yearly archive tab is still found and deleted from there', async () => {
    addArchiveTab(ID, 'هزینه 1402')
    setSheetAllRows(ID, 'هزینه 1402', [HEADERS, recordRow('old', 9)])
    markRecordDeletePending(ID, 'old')
    restart()

    expect(await finishInterruptedRecordDeletes(ID)).toBe(1)
    expect(getSheetAllRows(ID, 'هزینه 1402')?.slice(1)).toEqual([])
  })

  it('does nothing, and does not wait for the sync, when nothing is pending', async () => {
    mocks.synced = false

    expect(await finishInterruptedRecordDeletes(ID)).toBe(0)
    expect(rowIds()).toEqual(['rec-1', 'other', 'no-account'])
  })

  it('does not touch a delete this page is running itself', async () => {
    mocks.hangRow = true
    void deleteStoredRecord({
      spreadsheetId: ID,
      record: await storedRecord('rec-1'),
      form: EXPENSE
    })
    await vi.waitFor(() => expect(mocks.rowCalls).toBe(1))
    mocks.hangRow = false

    expect(await finishInterruptedRecordDeletes(ID)).toBe(0)
    expect(mocks.rowCalls).toBe(1)
    expect(rowIds()).toContain('rec-1')
  })

  it('a delete that fails with an error leaves no marker, so nothing is deleted behind the user', async () => {
    mocks.failRow = true
    await expect(
      deleteStoredRecord({
        spreadsheetId: ID,
        record: await storedRecord('rec-1'),
        form: EXPENSE
      })
    ).rejects.toThrow()

    expect(pendingRecordDeleteIds(ID)).toEqual([])
  })

  it('a heal whose delete fails keeps the marker for the next start', async () => {
    await confirmThenDie('rec-1')
    mocks.failRow = true
    expect(await finishInterruptedRecordDeletes(ID)).toBe(0)
    expect(pendingRecordDeleteIds(ID)).toEqual(['rec-1'])

    mocks.failRow = false
    restart()
    expect(await finishInterruptedRecordDeletes(ID)).toBe(1)
    expect(rowIds()).toEqual(['other', 'no-account'])
    expect(await refunds()).toHaveLength(1)
  })

  it('runs once per start', async () => {
    await confirmThenDie('rec-1')

    expect(await finishInterruptedRecordDeletes(ID)).toBe(1)
    markRecordDeletePending(ID, 'other')
    resetLiveRecordDeletes()
    expect(await finishInterruptedRecordDeletes(ID)).toBe(0)
    expect(rowIds()).toContain('other')
    expect(await refunds()).toHaveLength(1)
  })
})
