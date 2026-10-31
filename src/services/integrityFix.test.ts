import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsRowsModule from './sheetsRows'
import { SHEET_ID, accountRow, balanceOf, ledger, resetWallet } from './transfersTestKit'

const mocks = vi.hoisted(() => ({
  fetchRange: vi.fn(),
  enqueue: vi.fn(),
  activity: vi.fn()
}))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<typeof SheetsRowsModule>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity: mocks.activity, logItemActivity: vi.fn() }))

const { INTEGRITY_FIX_TITLE, postIntegrityCorrection } = await import('./integrityFix')
const { WALLET_HEADERS, WALLET_SHEET } = await import('./wallet')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET, ledgerRow } = await import('./walletLedger')
const { setSheetAllRows } = await import('./spreadsheetStore')
const { row } = await import('./walletTraceFixtures')

/** Account `a` holds `stored`; its history says 850 000 (1 000 000 − 200 000 + 50 000). */
function seed(stored: number, midGap = false) {
  setSheetAllRows(SHEET_ID, WALLET_SHEET, [WALLET_HEADERS, accountRow('a', stored)])
  setSheetAllRows(SHEET_ID, WALLET_LEDGER_SHEET, [
    WALLET_LEDGER_HEADERS,
    ledgerRow(row('a', 1_000_000, 1_000_000, { source: 'موجودی اولیه' })),
    ledgerRow(row('a', -200_000, midGap ? 1_300_000 : 800_000)),
    ledgerRow(row('a', 50_000, midGap ? 1_350_000 : 850_000))
  ])
}

beforeEach(() => {
  resetWallet(mocks.fetchRange)
  mocks.enqueue.mockReset()
  mocks.activity.mockReset()
})

describe('postIntegrityCorrection', () => {
  it('adds one labelled history row, leaves the balance alone, and does not repeat', async () => {
    seed(1_350_000)

    expect(await postIntegrityCorrection(SHEET_ID, 'a', 500_000)).toBe('fixed')

    const rows = ledger()

    expect(rows).toHaveLength(4)
    expect(rows[3]).toMatchObject({
      title: INTEGRITY_FIX_TITLE,
      source: 'اصلاح دستی',
      delta: 500_000,
      balanceAfter: 1_350_000,
      accountId: 'a'
    })
    expect(balanceOf('a')).toBe(1_350_000)
    expect(mocks.activity).toHaveBeenCalledTimes(1)
    expect(await postIntegrityCorrection(SHEET_ID, 'a', 500_000)).toBe('changed')
    expect(ledger()).toHaveLength(4)
  })

  it('writes nothing when the difference is no longer the one the person confirmed', async () => {
    seed(1_350_000)

    expect(await postIntegrityCorrection(SHEET_ID, 'a', 400_000)).toBe('changed')
    expect(ledger()).toHaveLength(3)
  })

  it('writes nothing for a gap between two rows', async () => {
    seed(1_350_000, true)

    expect(await postIntegrityCorrection(SHEET_ID, 'a', 500_000)).toBe('not-fixable')
    expect(ledger()).toHaveLength(3)
  })

  it('reports an account that was deleted meanwhile', async () => {
    seed(1_350_000)

    expect(await postIntegrityCorrection(SHEET_ID, 'zzz', 500_000)).toBe('gone')
  })
})
