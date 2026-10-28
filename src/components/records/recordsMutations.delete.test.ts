import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as InstallmentsCrudModule from '../../services/installmentsCrud'
import type * as SheetsModule from '../../services/sheets'
import type * as WalletModule from '../../services/wallet'
import type { CustomForm } from '../../types'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  fail: { wallet: false, row: false, plan: false },
  order: [] as string[]
}))

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
  refreshWalletAccounts: async (...args: unknown[]) => {
    mocks.order.push('read')
    mocks.refresh(...args)

    return new Set<string>()
  }
}))
vi.mock('../../utils/toast', () => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn()
}))
vi.mock('../../utils/sheetError', () => ({ handleSheetError: vi.fn() }))
vi.mock('../../services/wallet', async importOriginal => {
  const actual = await importOriginal<typeof WalletModule>()

  return {
    ...actual,
    updateWalletAccount: (...args: Parameters<typeof actual.updateWalletAccount>) => {
      mocks.order.push('balance')
      if (mocks.fail.wallet) return Promise.reject(new Error('balance write failed'))

      return actual.updateWalletAccount(...args)
    }
  }
})
vi.mock('../../services/sheets', async importOriginal => {
  const actual = await importOriginal<typeof SheetsModule>()

  return {
    ...actual,
    deleteRecord: (...args: Parameters<typeof actual.deleteRecord>) => {
      mocks.order.push('row')
      if (mocks.fail.row) return Promise.reject(new Error('row delete failed'))

      return actual.deleteRecord(...args)
    }
  }
})
vi.mock('../../services/installmentsCrud', async importOriginal => {
  const actual = await importOriginal<typeof InstallmentsCrudModule>()

  return {
    ...actual,
    updateInstallmentPlan: (...args: Parameters<typeof actual.updateInstallmentPlan>) => {
      if (mocks.fail.plan) return Promise.reject(new Error('plan write failed'))

      return actual.updateInstallmentPlan(...args)
    }
  }
})

const { deleteStoredRecord } = await import('./recordsMutations')
const { enrichRecord } = await import('./recordsUtils')
const { healOrphanedRecordLinks, resetRecordLinkHeal } = await import(
  '../../services/recordLinkHeal'
)
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

const ID = 'test-record-delete'

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

const recordRow = (id: string, amount: number) =>
  buildRecordRow(HEADERS, EXPENSE.fields, id, 't', {
    date: '2026-10-05',
    amount,
    title: `خرج ${id}`,
    walletAccount: 'acc',
    walletApply: 'بله'
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

/** The record as the list holds it: found in the sheet, with its row and tab. */
async function storedRecord(id: string) {
  const record = (await fetchRecords(ID, EXPENSE)).find(item => item.id === id)

  return enrichRecord(record!, EXPENSE)
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
  resetRecordLinkHeal()
  mocks.refresh.mockReset()
  mocks.order.length = 0
  Object.assign(mocks.fail, { wallet: false, row: false, plan: false })
  saveSettings({ spreadsheetId: ID, forms: [EXPENSE] } as never)
  // «rec-1» (100) sits above «other», so its row number is stale once it is gone.
  setSheetAllRows(ID, EXPENSE.sheetName, [HEADERS, recordRow('rec-1', 100), recordRow('other', 7)])
  // The 100 of «rec-1» was already taken from the account.
  setSheetAllRows(ID, WALLET_SHEET, [WALLET_HEADERS, ['acc', '', 'کارت', '400']])
  setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  setSheetAllRows(ID, INSTALLMENTS_SHEET, [INSTALLMENTS_HEADERS, planToRow(plan())])
})

describe('deleteStoredRecord', () => {
  it('refunds once, deletes the row and reopens the instalment it paid', async () => {
    await deleteStoredRecord({
      spreadsheetId: ID,
      record: await storedRecord('rec-1'),
      form: EXPENSE
    })

    expect(await balance()).toBe(500)
    expect(await refunds()).toHaveLength(1)
    expect(rowIds()).toEqual(['other'])
    expect(await secondInstalment()).toMatchObject({ paid: false, paidAt: '' })
  })

  it('reads before it writes, and refunds before the row goes', async () => {
    await deleteStoredRecord({
      spreadsheetId: ID,
      record: await storedRecord('rec-1'),
      form: EXPENSE
    })

    expect(mocks.order).toEqual(['read', 'balance', 'row'])
  })

  it('skips the balance re-read when the app is being closed', async () => {
    await deleteStoredRecord({
      spreadsheetId: ID,
      record: await storedRecord('rec-1'),
      form: EXPENSE,
      leaving: true
    })

    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(await balance()).toBe(500)
    expect(rowIds()).toEqual(['other'])
  })

  it('deleting the same record again refunds nothing more and keeps the row that slid up', async () => {
    const record = await storedRecord('rec-1')

    await deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })
    await deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })

    expect(await balance()).toBe(500)
    expect(await refunds()).toHaveLength(1)
    // «other» now sits on the stale row number of «rec-1» and must survive.
    expect(rowIds()).toEqual(['other'])
  })

  it('converges after the refund fails before anything else changed', async () => {
    const record = await storedRecord('rec-1')

    mocks.fail.wallet = true
    await expect(deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })).rejects.toThrow()
    expect(rowIds()).toEqual(['rec-1', 'other'])
    expect(await balance()).toBe(400)

    mocks.fail.wallet = false
    await deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })

    expect(await balance()).toBe(500)
    expect(await refunds()).toHaveLength(1)
    expect(rowIds()).toEqual(['other'])
    expect(await secondInstalment()).toMatchObject({ paid: false })
  })

  it('converges after an interruption between the refund and the row delete', async () => {
    const record = await storedRecord('rec-1')

    mocks.fail.row = true
    await expect(deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })).rejects.toThrow()
    // The money is back and the record is still listed, so it can be deleted again.
    expect(await balance()).toBe(500)
    expect(rowIds()).toEqual(['rec-1', 'other'])

    mocks.fail.row = false
    await deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })

    expect(await balance()).toBe(500)
    expect(await refunds()).toHaveLength(1)
    expect(rowIds()).toEqual(['other'])
    expect(await secondInstalment()).toMatchObject({ paid: false })
  })

  it('converges after an interruption once the row is gone and the instalment is still paid', async () => {
    const record = await storedRecord('rec-1')

    mocks.fail.plan = true
    await deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })
    mocks.fail.plan = false
    expect(rowIds()).toEqual(['other'])
    expect(await balance()).toBe(500)
    expect(await secondInstalment()).toMatchObject({ paid: true, transactionRecordId: 'rec-1' })

    await deleteStoredRecord({ spreadsheetId: ID, record, form: EXPENSE })

    expect(await balance()).toBe(500)
    expect(await refunds()).toHaveLength(1)
    expect(rowIds()).toEqual(['other'])
    expect(await secondInstalment()).toMatchObject({ paid: false, paidAt: '' })
  })

  it('the start-up heal finishes that interrupted delete without any retry', async () => {
    mocks.fail.plan = true
    await deleteStoredRecord({
      spreadsheetId: ID,
      record: await storedRecord('rec-1'),
      form: EXPENSE
    })
    mocks.fail.plan = false

    expect(await healOrphanedRecordLinks(ID)).toBe(1)
    expect(await secondInstalment()).toMatchObject({ paid: false, paidAt: '' })
    expect(await balance()).toBe(500)
  })
})
