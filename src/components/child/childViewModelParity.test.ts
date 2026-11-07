import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { forms, rec } from './childTestFixtures'
import { categoryBreakdown, entriesNet, monthSummary, toChildEntries } from './childViewModel'
import { filterByDateRange, sumByCategory } from '../../services/dashboardAggregation'
import { toCategoryShares } from '../../utils/categoryShares'
import { getDateRange } from '../../utils/dateRange'
import { parseNumeric } from '../../utils/parseNumeric'
import { roundMoney } from '../../utils/roundMoney'
import { summarizeFilteredRecords, type StoredRecord } from '../records/recordsUtils'

// What a parent sees in the child view must equal what the teenager sees on the personal pages,
// so these compare the child figures with the personal helpers on the same records.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-04T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('parity with the personal pages', () => {
  it('stays equal to the personal dashboard figures on the same records', () => {
    const rows = [
      rec('expense', { date: '2026-10-23', amount: '0.1', category: 'خوراک' }),
      rec('expense', { date: '2026-10-30', amount: '0.2', category: 'خوراک' }),
      rec('expense', { date: '2026-11-04', amount: '-30', category: '' }),
      rec('expense', { date: '2026-12-01', amount: '999', category: 'خوراک' }),
      rec('income', { date: '۲۰۲۶-۱۱-۰۱', amount: '۱٬۲۰۰٫۵', category: 'عیدی' }),
      rec('income', { date: '2026-11-30', amount: '77', category: 'عیدی' })
    ]

    const all = toChildEntries(rows, forms)
    const range = getDateRange('month-to-date')

    const ofKind = (kind: string) =>
      filterByDateRange(
        rows.filter(row => row.formType === kind),
        range,
        'date'
      )

    const sum = (list: StoredRecord[]) =>
      list.reduce((total, row) => roundMoney(total + parseNumeric(row.values.amount)), 0)

    const summary = monthSummary(all, '1405-08')

    expect(summary.income).toBe(sum(ofKind('income')))
    expect(summary.expense).toBe(sum(ofKind('expense')))
    expect(summary.expense).toBe(-29.7)
    expect(summary.balance).toBe(roundMoney(sum(ofKind('income')) - sum(ofKind('expense'))))

    const totals = summarizeFilteredRecords([...ofKind('income'), ...ofKind('expense')], forms)

    expect(summary.balance).toBe(roundMoney(totals.net))

    for (const kind of ['income', 'expense'] as const) {
      expect(categoryBreakdown(all, '1405-08', kind)).toEqual(
        toCategoryShares(sumByCategory(ofKind(kind)))
      )
    }
  })
})

describe('entriesNet', () => {
  it('is income minus expense of the list, as the records page nets it', () => {
    const list = toChildEntries(
      [
        rec('expense', { date: '2026-10-01', amount: '100000' }),
        rec('income', { date: '2026-10-02', amount: '400000' }),
        rec('expense', { date: '2026-10-06', amount: '30000.5' })
      ],
      forms
    )

    expect(entriesNet(list)).toBe(269999.5)
    expect(entriesNet(list)).toBe(
      summarizeFilteredRecords(
        list.map(e => e.record),
        forms
      ).net
    )
    expect(entriesNet([])).toBe(0)
  })
})
