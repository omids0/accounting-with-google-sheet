import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dang, Receivable } from '../types'
import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))

const { executeOutboxOperation } = await import('./sheetsOutboxApi')
const { createRowGuardSession } = await import('./sheetsRowGuard')
const { RowEditConflictError } = await import('./rowConflict')
const { dangToRow, rowToDang } = await import('./dangRow')
const { receivableToRow, rowToReceivable } = await import('./receivablesRow')
const { DANG_HEADERS, RECEIVABLES_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET, RECEIVABLES_SHEET } = await import('./sheetNames')
const { clearStore, getSheetRow, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'flush-merge'
const OTHER = 'sara@example.com'

const payment = (id: string, amount: number) => ({
  id,
  amount,
  paidAt: '2026-10-05',
  note: '',
  transactionRecordId: `rec-${id}`
})

const dang = (over: Partial<Dang> = {}): Dang => ({
  id: 'd1',
  createdAt: 't',
  title: 'مشترک',
  category: 'سایر',
  subCategory: '',
  counterparty: 'علی',
  amount: 10_000_000,
  date: '2026-10-01',
  note: '',
  paid: false,
  paidAt: '',
  payments: [],
  ...over
})

const receivable = (over: Partial<Receivable> = {}): Receivable => ({
  id: 'r1',
  createdAt: 't',
  title: 'قرض',
  debtor: 'رضا',
  category: 'سایر',
  amount: 10_000_000,
  borrowDate: '2026-10-01',
  note: '',
  payments: [],
  ...over
})

/** The tabs as the sheet holds them; every PUT lands here like a real write would. */
let remote: Record<string, string[][]> = {}

const puts: { range: string; row: string[] }[] = []

function install() {
  apiRequest.mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
    const tab = Object.keys(remote).find(name => url.includes(encodeURIComponent(`'${name}'`)))

    if (init?.method === 'PUT') {
      const row = JSON.parse(init.body ?? '{}').values[0].map(String) as string[]

      puts.push({ range: url, row })

      return {}
    }

    return { values: tab ? remote[tab] : [] }
  })
}

const idsOf = (row: string[], column: number) =>
  (JSON.parse(row[column]) as { id: string }[]).map(item => item.id)

describe('a queued debt or receivable write is re-based on the sheet row when it is sent', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    apiRequest.mockReset()
    puts.length = 0
    install()
  })

  it('debt: keeps the payment another device added, and recomputes the paid columns', async () => {
    const base = dangToRow(dang())

    remote = { [DANG_SHEET]: [DANG_HEADERS, dangToRow(dang({ payments: [payment('a', 6e6)] }))] }

    // This device (stale) paid 4M on a row it believed had no payments, and queued that.
    const mine = dangToRow(dang({ payments: [payment('b', 4e6)] }))

    setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, mine])

    await executeOutboxOperation(
      SHEET_ID,
      { type: 'update', sheetName: DANG_SHEET, rowNumber: 2, row: mine, expectedRow: base },
      { session: createRowGuardSession() }
    )

    expect(puts).toHaveLength(1)
    expect(idsOf(puts[0].row, 13)).toEqual(['a', 'b'])
    expect(puts[0].row[8]).toBe('بله')
    // The mirror shows what the sheet now holds.
    expect(rowToDang(getSheetRow(SHEET_ID, DANG_SHEET, 2)!, 2).payments).toHaveLength(2)
  })

  it('receivable: keeps the payment another device added', async () => {
    const base = receivableToRow(receivable())

    remote = {
      [RECEIVABLES_SHEET]: [
        RECEIVABLES_HEADERS,
        receivableToRow(receivable({ payments: [payment('a', 6e6)] }))
      ]
    }

    const mine = receivableToRow(receivable({ payments: [payment('b', 3e6)] }))

    await executeOutboxOperation(
      SHEET_ID,
      { type: 'update', sheetName: RECEIVABLES_SHEET, rowNumber: 2, row: mine, expectedRow: base },
      { session: createRowGuardSession() }
    )

    expect(idsOf(puts[0].row, 8)).toEqual(['a', 'b'])
    expect(rowToReceivable(puts[0].row, 2).amount).toBe(10_000_000)
  })

  it('another account that only added a payment is not a conflict', async () => {
    const base = dangToRow(dang())

    remote = {
      [DANG_SHEET]: [
        DANG_HEADERS,
        dangToRow(dang({ payments: [payment('a', 6e6)], writer: OTHER }))
      ]
    }

    const mine = dangToRow(dang({ title: 'عنوان من' }))

    await executeOutboxOperation(
      SHEET_ID,
      { type: 'update', sheetName: DANG_SHEET, rowNumber: 2, row: mine, expectedRow: base },
      { session: createRowGuardSession() }
    )

    expect(idsOf(puts[0].row, 13)).toEqual(['a'])
    expect(puts[0].row[2]).toBe('عنوان من')
  })

  it('another account that edited the debt itself still asks «کدام بماند؟»', async () => {
    const base = dangToRow(dang())

    remote = {
      [DANG_SHEET]: [DANG_HEADERS, dangToRow(dang({ title: 'عنوان آنها', writer: OTHER }))]
    }

    await expect(
      executeOutboxOperation(
        SHEET_ID,
        {
          type: 'update',
          sheetName: DANG_SHEET,
          rowNumber: 2,
          row: dangToRow(dang({ title: 'عنوان من' })),
          expectedRow: base
        },
        { session: createRowGuardSession() }
      )
    ).rejects.toBeInstanceOf(RowEditConflictError)
    expect(puts).toHaveLength(0)
  })

  it('a write queued by an older build (no base) goes out unchanged', async () => {
    remote = { [DANG_SHEET]: [DANG_HEADERS, dangToRow(dang({ payments: [payment('a', 6e6)] }))] }

    const mine = dangToRow(dang({ payments: [payment('b', 4e6)] }))

    await executeOutboxOperation(
      SHEET_ID,
      { type: 'update', sheetName: DANG_SHEET, rowNumber: 2, row: mine },
      { session: createRowGuardSession() }
    )

    expect(puts[0].row).toEqual(mine)
  })

  it('a payment this write removed stays removed', async () => {
    const base = dangToRow(dang({ payments: [payment('a', 1e6), payment('b', 2e6)] }))

    remote = {
      [DANG_SHEET]: [
        DANG_HEADERS,
        dangToRow(dang({ payments: [payment('a', 1e6), payment('b', 2e6), payment('c', 3e6)] }))
      ]
    }

    const mine = dangToRow(dang({ payments: [payment('b', 2e6)] }))

    await executeOutboxOperation(
      SHEET_ID,
      { type: 'update', sheetName: DANG_SHEET, rowNumber: 2, row: mine, expectedRow: base },
      { session: createRowGuardSession() }
    )

    expect(idsOf(puts[0].row, 13)).toEqual(['b', 'c'])
  })
})
