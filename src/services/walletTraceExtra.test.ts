import { describe, expect, it } from 'vitest'

import { traceDiscrepancy } from './walletTrace'
import { account, input, record, row } from './walletTraceFixtures'

describe('traceDiscrepancy: crowds, hints and old records', () => {
  it('does not hint at a record that already explains part of the difference', () => {
    const records = [record('r1', 8_000_000, { accountId: '' })]
    const report = traceDiscrepancy({
      ...input([account('a', 1_000_000)], [], records),
      difference: 9_000_000
    })

    expect(report.findings[0]).toMatchObject({ kind: 'no-account', effect: 8_000_000 })
    expect(report.remainder).toBe(1_000_000)
    expect(report.hints).toEqual([])
  })

  it('folds hundreds of records without an account into a few rows, and still counts them', () => {
    const records = Array.from({ length: 30 }, (_, index) =>
      record(`n${index}`, 10_000 * (index + 1), { accountId: '' })
    )
    const total = records.reduce((sum, item) => sum + item.amount, 0)
    const report = traceDiscrepancy(input([account('a', 1_000_000)], [], records))
    const rest = report.findings.find(item => item.id === 'no-account:rest')

    expect(report.findings).toHaveLength(6)
    expect(rest?.effect).toBe(total - [30, 29, 28, 27, 26].reduce((sum, n) => sum + n * 10_000, 0))
    expect(report.explained).toBe(total)
    expect(report.remainder).toBe(0)
    expect(report.timeline.reduce((sum, month) => sum + month.effect, 0)).toBe(total)
  })

  it('treats a record without an account from before any account existed as ordinary', () => {
    const first = Date.UTC(2026, 9, 12)
    const records = [
      record('old', 700_000, { accountId: '', createdAtMs: first - 86_400_000 }),
      record('new', 200_000, { accountId: '', createdAtMs: first + 86_400_000 })
    ]
    const ledger = [
      row('a', 1, 1_000_000, { createdAt: '۱۴۰۵/۷/۲۰, ۲۰:۳۶:۲۸', source: 'موجودی اولیه' })
    ]
    const report = traceDiscrepancy(input([account('a', 1_000_000)], ledger, records))
    const byRecord = Object.fromEntries(report.findings.map(item => [item.record?.id, item]))

    expect(byRecord.old).toMatchObject({ kind: 'pre-accounts', group: 'known' })
    expect(byRecord.new).toMatchObject({ kind: 'no-account', group: 'suspect' })
  })

  it('hints at a record with the exact remainder amount', () => {
    const records = [record('r1', 8_000_000)]
    const report = traceDiscrepancy({
      ...input(
        [account('a', 1_000_000)],
        [row('a', -8_000_000, 1_000_000, { recordId: 'r1' })],
        records
      ),
      difference: 8_000_000
    })

    expect(report.hints[0]?.record?.id).toBe('r1')
  })
})
