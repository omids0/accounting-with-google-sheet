import { describe, expect, it } from 'vitest'

import { traceDiscrepancy } from './walletTrace'
import { account, input, row } from './walletTraceFixtures'

/** A moved 400k to B: wallet total is unchanged, so the difference stays 0. */
const legs = (recordId = 't1') => [
  row('a', -400_000, 600_000, { source: 'transfer', recordId, title: 'انتقال به «b»' }),
  row('b', 400_000, 1_400_000, { source: 'transfer', recordId, title: 'انتقال از «a»' })
]

const accounts = () => [account('a', 600_000), account('b', 1_400_000)]

describe('transfers in the wallet trace', () => {
  it('explains both legs of an existing transfer as known causes that cancel out', () => {
    const report = traceDiscrepancy({
      ...input(accounts(), legs(), [], 2_000_000),
      transferIds: new Set(['t1'])
    })

    expect(report.findings.map(item => item.kind)).toEqual(['transfer', 'transfer'])
    expect(report.findings.every(item => item.group === 'known')).toBe(true)
    expect(report.findings.reduce((sum, item) => sum + item.effect, 0)).toBe(0)
    expect(report.difference).toBe(0)
    expect(report.remainder).toBe(0)
  })

  it('reports a leg whose transfer row is missing, once per account', () => {
    const report = traceDiscrepancy({
      ...input(accounts(), legs(), [], 2_000_000),
      transferIds: new Set()
    })

    expect(
      report.findings.map(item => [item.kind, item.group, item.accountId, item.effect])
    ).toEqual(
      expect.arrayContaining([
        ['orphan-ledger', 'suspect', 'a', -400_000],
        ['orphan-ledger', 'suspect', 'b', 400_000]
      ])
    )
    expect(report.findings).toHaveLength(2)
    expect(report.findings.every(item => item.kind !== 'unlinked-ledger')).toBe(true)
  })

  it('stays silent about a transfer that was deleted in the app (moves and reversals add up)', () => {
    const reversals = [
      row('a', 400_000, 1_000_000, {
        source: 'transfer',
        recordId: 't1',
        title: 'لغو انتقال به «b»'
      }),
      row('b', -400_000, 1_000_000, {
        source: 'transfer',
        recordId: 't1',
        title: 'لغو انتقال از «a»'
      })
    ]
    const report = traceDiscrepancy({
      ...input(
        [account('a', 1_000_000), account('b', 1_000_000)],
        [...legs(), ...reversals],
        [],
        2_000_000
      ),
      transferIds: new Set()
    })

    expect(report.findings).toEqual([])
    expect(report.remainder).toBe(0)
  })

  it('does not call transfers suspect when the transfers tab could not be read', () => {
    const report = traceDiscrepancy(input(accounts(), legs(), [], 2_000_000))

    expect(report.findings.map(item => item.kind)).toEqual(['transfer', 'transfer'])
    expect(report.findings.every(item => item.group === 'known')).toBe(true)
  })

  it('leaves the balance difference to a real gap: a transfer never hides one', () => {
    const report = traceDiscrepancy({
      ...input([account('a', 600_000), account('b', 1_500_000)], legs(), [], 2_000_000),
      transferIds: new Set(['t1'])
    })

    expect(report.difference).toBe(100_000)
    expect(report.findings.some(item => item.kind === 'outside-ledger')).toBe(true)
  })
})
