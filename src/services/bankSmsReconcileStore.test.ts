import { beforeEach, describe, expect, it } from 'vitest'

import { reconcileDigestLines } from './bankSmsReconcileDigest'
import {
  ignoreReconcileDifference,
  readReconcileDigestGate,
  readReconcileEntries,
  saveReconcileSuccess,
  writeReconcileDigestGate
} from './bankSmsReconcileStore'

const TODAY = '2026-10-13'

describe('accounting_reconcile_v1', () => {
  beforeEach(() => localStorage.clear())

  it('keeps «نادیده» and the last success per spreadsheet', () => {
    ignoreReconcileDifference('sheetA', 'mellat', 350_000)
    expect(readReconcileEntries('sheetA')).toEqual({ mellat: { ignored: 350_000 } })
    expect(readReconcileEntries('sheetB')).toEqual({})

    saveReconcileSuccess('sheetA', 'mellat', { balance: 3_900_000, smsAt: 1 }, new Date(0))
    // A success replaces the ignored difference.
    expect(readReconcileEntries('sheetA').mellat).toEqual({
      at: new Date(0).toISOString(),
      balance: 3_900_000,
      smsAt: 1
    })
  })
})

describe('digest lines once per day', () => {
  beforeEach(() => localStorage.clear())

  it('returns the lines built today without building them again', async () => {
    writeReconcileDigestGate('sheetA', {
      date: TODAY,
      lines: { mellat: 'ملت ۳۵۰ هزار اختلاف دارد' }
    })

    expect(await reconcileDigestLines('sheetA', TODAY)).toEqual(['ملت ۳۵۰ هزار اختلاف دارد'])
    // Another day: rebuilt (off Android there are no SMS, so no line).
    expect(await reconcileDigestLines('sheetA', '2026-10-14')).toEqual([])
  })

  it('drops the account line after «نادیده» or a reconciliation', () => {
    writeReconcileDigestGate('sheetA', { date: TODAY, lines: { mellat: 'a', saman: 'b' } })

    ignoreReconcileDifference('sheetA', 'mellat', 1)
    saveReconcileSuccess('sheetA', 'saman', { balance: 1, smsAt: 1 })

    expect(readReconcileDigestGate('sheetA')).toEqual({ date: TODAY, lines: {} })
  })
})
