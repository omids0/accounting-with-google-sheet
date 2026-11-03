import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsModule from './sheets'
import type { Check, CustomForm, InstallmentPlan } from '../types'
import { buildPayments } from './installmentsSchedule'

const mocks = vi.hoisted(() => ({ writes: vi.fn(), sheetError: vi.fn(), info: vi.fn() }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./sheets', async importOriginal => {
  const original = await importOriginal<typeof SheetsModule>()

  return {
    ...original,
    updateSheetRow: (...args: Parameters<typeof original.updateSheetRow>) => {
      mocks.writes(...args)

      return original.updateSheetRow(...args)
    }
  }
})
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showInfo: mocks.info,
  showError: vi.fn(),
  showSuccess: vi.fn()
}))
vi.mock('../utils/sheetError', () => ({ handleSheetError: mocks.sheetError }))

const { CHECK_DIRECTION_COLUMN } = await import('./checkDirection')
const { checkToRow } = await import('./checkRows')
const { CHECKS_HEADERS, CHECKS_SHEET, fetchChecks } = await import('./checks')
const { INSTALLMENTS_HEADERS, INSTALLMENTS_SHEET, invalidateInstallmentsCache } = await import(
  './installmentsConstants'
)
const { fetchInstallmentPlans, planToRow } = await import('./installmentsCrud')
const { healOrphanedRecordLinks, resetRecordLinkHeal } = await import('./recordLinkHeal')
const { saveSettings } = await import('./settings')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')
const { updateSyncMeta } = await import('./spreadsheetSyncMeta')
const { setWorkspaceType } = await import('./workspace')

const ID = 'test-record-link-heal'

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: [{ id: 'date', label: 'تاریخ', type: 'date', required: true }]
}

const INCOME: CustomForm = {
  ...EXPENSE,
  id: 'form_income',
  name: 'درآمد',
  sheetName: 'درآمد',
  type: 'income'
}

const RECORD_HEADER = ['شناسه', 'زمان ثبت', 'تاریخ']

const plan = (recordId: string): InstallmentPlan => ({
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
      ? { ...payment, paid: true, paidAt: '2026-09-07', transactionRecordId: recordId }
      : payment
  )
})

const check = (recordId: string): Check => ({
  id: 'c1',
  createdAt: 't',
  checkNumber: '123',
  direction: 'paid',
  counterparty: 'علی',
  amount: 5_000_000,
  creationDate: '2026-10-01',
  dueDate: '2026-10-20',
  paid: true,
  paidAt: '2026-10-05',
  transactionRecordId: recordId,
  subCategory: ''
})

const seedPlan = (recordId: string) =>
  setSheetAllRows(ID, INSTALLMENTS_SHEET, [INSTALLMENTS_HEADERS, planToRow(plan(recordId))])

const instalment = async () =>
  (await fetchInstallmentPlans(ID))[0].payments.find(payment => payment.n === 2)!

beforeEach(() => {
  localStorage.clear()
  clearStore(ID)
  invalidateInstallmentsCache(ID)
  resetRecordLinkHeal()
  Object.values(mocks).forEach(mock => mock.mockReset())
  saveSettings({ spreadsheetId: ID, forms: [EXPENSE, INCOME] } as never)
  setSheetAllRows(ID, EXPENSE.sheetName, [RECORD_HEADER, ['other', 't', '2026-10-01']])
  setSheetAllRows(ID, INCOME.sheetName, [RECORD_HEADER])
})

describe('healOrphanedRecordLinks', () => {
  it('reopens an instalment whose record is gone, silently', async () => {
    seedPlan('rec-gone')

    expect(await healOrphanedRecordLinks(ID)).toBe(1)
    expect(await instalment()).toMatchObject({ paid: false, paidAt: '' })
    expect((await instalment()).transactionRecordId).toBeFalsy()
    expect(mocks.info).not.toHaveBeenCalled()
    expect(mocks.sheetError).not.toHaveBeenCalled()
  })

  it('reopens a paid check whose record is gone', async () => {
    setSheetAllRows(ID, CHECKS_SHEET, [
      CHECKS_HEADERS,
      checkToRow(check('rec-gone'), CHECK_DIRECTION_COLUMN)
    ])

    await healOrphanedRecordLinks(ID)

    expect((await fetchChecks(ID))[0]).toMatchObject({
      paid: false,
      paidAt: '',
      transactionRecordId: ''
    })
  })

  it('leaves alone a record that lives in a yearly archive tab', async () => {
    updateSyncMeta(ID, { archiveTabs: ['هزینه 1402'] })
    setSheetAllRows(ID, 'هزینه 1402', [RECORD_HEADER, ['rec-archived', 't', '2023-06-01']])
    seedPlan('rec-archived')

    expect(await healOrphanedRecordLinks(ID)).toBe(0)
    expect(await instalment()).toMatchObject({ paid: true, transactionRecordId: 'rec-archived' })
    expect(mocks.writes).not.toHaveBeenCalled()
  })

  it('is a no-op when every payment still points at a record', async () => {
    seedPlan('other')
    setSheetAllRows(ID, CHECKS_SHEET, [
      CHECKS_HEADERS,
      checkToRow(check('other'), CHECK_DIRECTION_COLUMN)
    ])

    expect(await healOrphanedRecordLinks(ID)).toBe(0)
    expect(await instalment()).toMatchObject({ paid: true })
    expect((await fetchChecks(ID))[0].paid).toBe(true)
    expect(mocks.writes).not.toHaveBeenCalled()
  })

  it('does nothing when no payment is linked at all', async () => {
    expect(await healOrphanedRecordLinks(ID)).toBe(0)
    expect(mocks.writes).not.toHaveBeenCalled()
  })

  it('runs once per start', async () => {
    seedPlan('rec-gone')
    await healOrphanedRecordLinks(ID)
    seedPlan('rec-gone-again')
    invalidateInstallmentsCache(ID)

    expect(await healOrphanedRecordLinks(ID)).toBe(0)
    expect(await instalment()).toMatchObject({ paid: true })
  })

  it('does not guess while a tab that could hold the record is not in the mirror', async () => {
    seedPlan('rec-gone')
    updateSyncMeta(ID, { archiveTabs: ['هزینه 1402'] })

    expect(await healOrphanedRecordLinks(ID)).toBe(0)
    expect(await instalment()).toMatchObject({ paid: true })
  })

  it('skips buildings and shared accounts', async () => {
    seedPlan('rec-gone')
    setWorkspaceType(ID, 'building')

    expect(await healOrphanedRecordLinks(ID)).toBe(0)
    expect(await instalment()).toMatchObject({ paid: true })
  })
})
