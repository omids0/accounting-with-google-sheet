import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MODULE_SHEET_SPECS } from './moduleSheetSpecs'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import type { AppSettings } from '../types'
import {
  appendLedgerEntries,
  fetchLedger,
  ledgerEntry,
  ledgerRow,
  logBalanceSet,
  rowToLedgerEntry,
  WALLET_LEDGER_HEADERS,
  WALLET_LEDGER_SHEET
} from './walletLedger'

vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn() }))
vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))

const SPREADSHEET_ID = 'ledger-test'

const context = { title: 'ناهار', date: '1405-07-19', source: 'ثبت' as const, recordId: 'r1' }

describe('ledger rows', () => {
  it('round-trips an applied entry', () => {
    const entry = ledgerEntry('acc', -120000, 380000, context)

    expect(rowToLedgerEntry(ledgerRow(entry))).toEqual(entry)
    expect(ledgerRow(entry)[9]).toBe('بله')
  })

  it('stores an entry that did not move the balance as «خیر»', () => {
    const entry = ledgerEntry('acc', 0, 500000, context, false)

    expect(ledgerRow(entry)[9]).toBe('خیر')
    expect(rowToLedgerEntry(ledgerRow(entry)).applied).toBe(false)
  })
})

describe('logBalanceSet', () => {
  beforeEach(() => {
    clearStore(SPREADSHEET_ID)
    setSheetAllRows(SPREADSHEET_ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('logs a manual edit as the difference to the new balance', async () => {
    await logBalanceSet(SPREADSHEET_ID, 'acc', 500, 650, 'اصلاح دستی')

    expect((await fetchLedger(SPREADSHEET_ID, 'acc'))[0]).toMatchObject({
      delta: 150,
      balanceAfter: 650,
      source: 'اصلاح دستی',
      title: 'اصلاح دستی موجودی'
    })
  })

  it('logs nothing when the balance did not change', async () => {
    await logBalanceSet(SPREADSHEET_ID, 'acc', 0, 0, 'موجودی اولیه')

    expect(await fetchLedger(SPREADSHEET_ID, 'acc')).toEqual([])
  })
})

describe('ledger tab', () => {
  it('is created and synced with the other module tabs', () => {
    expect(MODULE_SHEET_SPECS).toContainEqual({
      sheetName: WALLET_LEDGER_SHEET,
      headers: WALLET_LEDGER_HEADERS
    })
    expect(getKnownSheetNames({ forms: [] } as unknown as AppSettings)).toContain(
      WALLET_LEDGER_SHEET
    )
  })

  it('keeps the first entry when the tab is not in the local store yet', async () => {
    clearStore(SPREADSHEET_ID)

    await appendLedgerEntries(SPREADSHEET_ID, [ledgerEntry('acc', -100, 900, context)])

    expect(await fetchLedger(SPREADSHEET_ID, 'acc')).toHaveLength(1)
  })
})

describe('fetchLedger', () => {
  beforeEach(() => {
    clearStore(SPREADSHEET_ID)
    setSheetAllRows(SPREADSHEET_ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('returns only the account rows, newest first', async () => {
    await appendLedgerEntries(SPREADSHEET_ID, [
      ledgerEntry('acc', -100, 900, { ...context, title: 'اول' }),
      ledgerEntry('other', 50, 50, { ...context, title: 'دیگر' }),
      ledgerEntry('acc', -200, 700, { ...context, title: 'دوم' })
    ])

    const entries = await fetchLedger(SPREADSHEET_ID, 'acc')

    expect(entries.map(entry => entry.title)).toEqual(['دوم', 'اول'])
    expect(entries[0].balanceAfter).toBe(700)
  })
})
