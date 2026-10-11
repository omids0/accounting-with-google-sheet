import { describe, expect, it } from 'vitest'

import { buildEntryDraftState, readEntryDraft } from './entryDraft'
import { ledgerEntry } from './walletLedger'
import { ledgerTable } from './walletLedgerExport'

const context = { title: 'ناهار', date: '1405-07-19', source: 'ثبت' as const }

describe('ledgerTable', () => {
  it('lists the account history with signed amounts and the balance after each row', () => {
    const table = ledgerTable([
      ledgerEntry('acc', -120000, 380000, context),
      ledgerEntry('acc', -5000, 500000, { ...context, title: 'تاکسی' }, false)
    ])

    expect(table.headers).toEqual(['تاریخ', 'عنوان', 'منبع', 'مبلغ', 'موجودی بعد', 'اثر'])
    expect(table.rows[0]).toEqual(['1405-07-19', 'ناهار', 'ثبت', '-120000', '380000', 'بله'])
    expect(table.rows[1][5]).toBe('بدون اثر')
  })
})

describe('entry draft from the account history', () => {
  it('opens the entry form with the account chosen and returns afterwards', () => {
    const state = buildEntryDraftState('expense', { walletAccount: 'acc' })

    expect(readEntryDraft(state)).toEqual({
      formType: 'expense',
      prefill: { walletAccount: 'acc' }
    })
  })

  it('ignores router state that is not an entry draft', () => {
    expect(readEntryDraft(null)).toBeNull()
    expect(readEntryDraft({ title: 'x' })).toBeNull()
  })
})
