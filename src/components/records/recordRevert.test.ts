import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AuthModule from '../../services/auth'
import type { CustomForm } from '../../types'

vi.mock('../../services/sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))
vi.mock('../../services/auth', async importOriginal => ({
  ...(await importOriginal<typeof AuthModule>()),
  getUserEmail: () => 'me@example.com',
  getUserName: () => 'امید',
  isTokenValid: () => true
}))
vi.mock('../../services/openingBalanceRefresh', () => ({
  refreshOpeningBalancesInBackground: vi.fn()
}))
vi.mock('../../services/walletFresh', () => ({
  refreshWalletAccounts: async () => new Set<string>()
}))
vi.mock('../../services/vehicleExpenseActions', () => ({
  handleExpenseRecordUpdated: vi.fn(async () => undefined),
  handleExpenseRecordDeleted: vi.fn(async () => undefined),
  createManualVehicleExpense: vi.fn()
}))
vi.mock('../../utils/toast', () => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn()
}))
vi.mock('../../utils/sheetError', () => ({ handleSheetError: vi.fn() }))

const { deleteStoredRecord, submitRecordEdit } = await import('./recordsMutations')
const { enrichRecord } = await import('./recordsUtils')
const { planRecordRevert, resetRevertSession, runRecordRevert } = await import('./recordRevert')
const { fetchActivityLog } = await import('../../services/activityLog')
const { revertOffered, revertedLogIds } = await import('../../services/activityTrailRevert')
const { checkIntegrity } = await import('../../services/integrityCheck')
const { ACTIVITY_LOG_HEADERS } = await import('../../services/sheetHeaders')
const { ACTIVITY_LOG_SHEET } = await import('../../services/sheetNames')
const { buildHeaders, buildRecordRow } = await import('../../services/sheetsHeaders')
const { fetchRecords } = await import('../../services/sheets')
const { saveSettings } = await import('../../services/settings')
const { clearStore, getSheetDataRows, setSheetAllRows } = await import(
  '../../services/spreadsheetStore'
)
const { fetchWalletAccounts, WALLET_HEADERS, WALLET_SHEET } = await import('../../services/wallet')
const { fetchAllLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET, ledgerRow } = await import(
  '../../services/walletLedger'
)
const { row: ledgerSeed } = await import('../../services/walletTraceFixtures')

const ID = 'test-record-revert'

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true },
    { id: 'title', label: 'عنوان', type: 'text', required: false },
    { id: 'category', label: 'دسته', type: 'text', required: false },
    { id: 'note', label: 'یادداشت', type: 'text', required: false },
    { id: 'walletAccount', label: 'حساب', type: 'text', required: false },
    { id: 'walletApply', label: 'اثر بر موجودی', type: 'text', required: false }
  ]
}

const HEADERS = buildHeaders(EXPENSE.fields)

const RECORD = {
  date: '2026-10-05',
  amount: '100',
  title: 'نان',
  category: 'خوراک',
  note: '',
  walletAccount: 'acc',
  walletApply: 'بله'
}

const stored = async (id: string) => {
  const record = (await fetchRecords(ID, EXPENSE)).find(item => item.id === id)

  return record ? enrichRecord(record, EXPENSE) : null
}

const edit = async (id: string, change: Record<string, string | number>) => {
  const record = (await stored(id))!

  return submitRecordEdit({
    editingRecord: record,
    editingForm: EXPENSE,
    formValues: { ...record.values, ...change },
    onSuccess: async () => undefined
  })
}

const balance = async () =>
  (await fetchWalletAccounts(ID)).find(account => account.id === 'acc')!.balance

const logRows = async () => fetchActivityLog(ID, 100, 0)

/** The log rows written so far (the write is queued after the record's own). */
const logCount = async (count: number) =>
  vi.waitFor(async () => expect((await logRows()).length).toBe(count))

/** The log rows of `action` (newest first; rows of one millisecond keep no order). */
const logOf = async (action: string) => (await logRows()).filter(entry => entry.action === action)

async function integrity() {
  const [accounts, ledger] = await Promise.all([fetchWalletAccounts(ID), fetchAllLedger(ID)])

  return checkIntegrity({ accounts, ledger, transfers: [], records: [], outbox: [], now: 0 })
}

beforeEach(() => {
  localStorage.clear()
  clearStore(ID)
  resetRevertSession()
  saveSettings({ spreadsheetId: ID, forms: [EXPENSE] } as never)
  setSheetAllRows(ID, EXPENSE.sheetName, [
    HEADERS,
    buildRecordRow(HEADERS, EXPENSE.fields, 'rec-1', 't', RECORD)
  ])
  // 100 of «rec-1» was already taken from the account: 1000 → 900.
  setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '900']])
  setSheetAllRows(ID, WALLET_LEDGER_SHEET, [
    WALLET_LEDGER_HEADERS,
    ledgerRow(ledgerSeed('acc', 1000, 1000, { source: 'موجودی اولیه' })),
    ledgerRow(ledgerSeed('acc', -100, 900, { recordId: 'rec-1' }))
  ])
  setSheetAllRows(ID, ACTIVITY_LOG_SHEET, [ACTIVITY_LOG_HEADERS])
})

describe('edit → revert', () => {
  it('stores only the changed fields, then restores values, balance and history', async () => {
    expect(await edit('rec-1', { amount: 250, note: 'تازه' })).toBe(true)
    await logCount(1)

    const [update] = await logOf('update')

    expect(JSON.parse(update.before)).toEqual({ amount: '100', note: '' })
    expect(JSON.parse(update.after)).toEqual({ amount: '250', note: 'تازه' })
    expect(await balance()).toBe(750)

    expect(await runRecordRevert(ID, update)).toEqual({ status: 'done' })
    await logCount(2)

    expect((await stored('rec-1'))!.values).toMatchObject({ amount: '100', note: '' })
    expect(await balance()).toBe(900)

    const report = await integrity()

    expect(report.clean).toBe(true)
    expect(report.accounts[0]).toMatchObject({ stored: 900, derived: 900, difference: 0 })
    expect((await logOf('revert'))[0].summary).toContain('بازگرداند')
    // The old row is untouched: the log only grows.
    expect((await logOf('update'))[0]).toEqual(update)
  })

  it('is refused once the record changed again, and says which field', async () => {
    await edit('rec-1', { amount: 250 })
    await logCount(1)
    await edit('rec-1', { amount: 300 })
    await logCount(2)

    const first = (await logOf('update')).find(entry => JSON.parse(entry.after).amount === '250')!
    const result = await runRecordRevert(ID, first)

    expect(result).toMatchObject({ status: 'refused' })
    expect((result as { reason: string }).reason).toContain('«مبلغ»')
    expect((await stored('rec-1'))!.values.amount).toBe('300')
    expect(await balance()).toBe(700)
  })

  it('is offered once: a second tap while running, and a second try after, do nothing', async () => {
    await edit('rec-1', { amount: 250 })
    await logCount(1)

    const [update] = await logOf('update')
    const results = await Promise.all([runRecordRevert(ID, update), runRecordRevert(ID, update)])

    expect(results.map(result => result.status).sort()).toEqual(['busy', 'done'])
    expect(await runRecordRevert(ID, update)).toMatchObject({ status: 'refused' })
    await logCount(2)
    expect(await balance()).toBe(900)
    expect(await logOf('revert')).toHaveLength(1)

    const ctx = { reverted: revertedLogIds(await logRows()), me: 'me@example.com', may: () => true }

    expect(revertOffered(update, ctx)).toBe(false)
    expect((await planRecordRevert(ID, update)).ok).toBe(false)
  })
})

describe('delete → revert', () => {
  it('creates the record again with the same fields and its balance effect', async () => {
    await deleteStoredRecord({
      spreadsheetId: ID,
      record: (await stored('rec-1'))!,
      form: EXPENSE
    })
    await logCount(1)
    expect(await stored('rec-1')).toBeNull()
    expect(await balance()).toBe(1000)

    const [deleted] = await logOf('delete')

    expect(JSON.parse(deleted.before)).toMatchObject({ amount: '100', title: 'نان' })
    expect(await runRecordRevert(ID, deleted)).toEqual({ status: 'done' })

    const rows = getSheetDataRows(ID, EXPENSE.sheetName) ?? []

    expect(rows).toHaveLength(1)
    expect((await fetchRecords(ID, EXPENSE))[0].values).toMatchObject(RECORD)
    expect(await balance()).toBe(900)
    expect((await integrity()).clean).toBe(true)
    await logCount(2)
    expect((await logOf('revert'))[0].summary).toContain('حذف')
    expect(await runRecordRevert(ID, deleted)).toMatchObject({ status: 'refused' })
    expect(getSheetDataRows(ID, EXPENSE.sheetName)).toHaveLength(1)
  })
})
