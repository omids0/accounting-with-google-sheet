import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Receivable } from '../types'
import { deleteLinkedIncomeRecord } from './paymentTransactions'
import { deleteReceivable } from './receivablesCrud'
import { RECEIVABLES_HEADERS, RECEIVABLES_SHEET, receivableToRow } from './receivablesRow'
import { clearStore, setSheetAllRows } from './spreadsheetStore'

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))

vi.mock('./paymentTransactions', () => ({
  deleteLinkedIncomeRecord: vi.fn().mockResolvedValue(undefined)
}))

const SHEET_ID = 'test-receivables-sheet'

function makeReceivable(): Receivable {
  return {
    id: 'rec-1',
    createdAt: '2026-10-01',
    title: 'وام',
    debtor: 'علی',
    category: 'شخصی',
    amount: 8_000_000,
    borrowDate: '2026-10-01',
    note: '',
    payments: [
      { id: 'p1', amount: 5_000_000, paidAt: '2026-10-02', note: '', transactionRecordId: 'tx-1' },
      { id: 'p2', amount: 3_000_000, paidAt: '2026-10-03', note: '' }
    ]
  }
}

describe('deleting a receivable that made income records', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    vi.mocked(deleteLinkedIncomeRecord).mockClear()
    setSheetAllRows(SHEET_ID, RECEIVABLES_SHEET, [
      RECEIVABLES_HEADERS,
      receivableToRow(makeReceivable())
    ])
  })

  it('deletes the records its payments made by default', async () => {
    await deleteReceivable(SHEET_ID, 2, makeReceivable())

    expect(deleteLinkedIncomeRecord).toHaveBeenCalledTimes(1)
    expect(deleteLinkedIncomeRecord).toHaveBeenCalledWith(SHEET_ID, 'tx-1')
  })

  it('leaves them as ordinary income when asked to keep them', async () => {
    await deleteReceivable(SHEET_ID, 2, makeReceivable(), true)

    expect(deleteLinkedIncomeRecord).not.toHaveBeenCalled()
  })
})
