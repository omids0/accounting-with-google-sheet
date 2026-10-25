import { describe, expect, it } from 'vitest'

import type { LedgerEntry as RecordEntry } from './recordDuplicates'
import type { LedgerEntry } from './walletLedger'
import { traceDiscrepancy } from './walletTrace'
import type { TraceInput } from './walletTraceTypes'
import type { WalletAccount } from '../types'
import { RECONCILIATION_CATEGORY } from '../utils/protectedCategories'

// 1405-01 (فروردین) starts on 2026-03-21; «today» is in 1405-04 (تیر).
const START = '2026-03-21'
const TODAY = '2026-07-01'

function account(id: string, balance: number, title = id): WalletAccount {
  return {
    id,
    title,
    balance,
    createdAt: '',
    note: '',
    accountKind: '',
    bankId: '',
    cardNumber: '',
    cardHolder: '',
    cardColor: '',
    cardColorPrimary: '',
    cardColorSecondary: '',
    iban: '',
    accountNumber: ''
  }
}

let counter = 0

function row(
  accountId: string,
  delta: number,
  balanceAfter: number,
  extra: Partial<LedgerEntry> = {}
): LedgerEntry {
  counter += 1

  return {
    id: `l${counter}`,
    createdAt: '',
    accountId,
    delta,
    balanceAfter,
    title: 'گردش',
    date: '2026-04-10',
    source: 'ثبت',
    recordId: '',
    applied: true,
    ...extra
  }
}

function record(id: string, amount: number, extra: Partial<RecordEntry> = {}): RecordEntry {
  return {
    id,
    type: 'expense',
    amount,
    date: '2026-04-10',
    accountId: 'a',
    title: `رکورد ${id}`,
    category: 'خوراک',
    moved: true,
    ...extra
  }
}

/** `wallet − (opening + income − expense)` the way the wallet page computes it. */
function difference(accounts: WalletAccount[], records: RecordEntry[], opening: number): number {
  const wallet = accounts.reduce((sum, item) => sum + item.balance, 0)
  const net = records
    .filter(item => item.date >= START && item.date <= TODAY)
    .reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0)

  return wallet - (opening + net)
}

function input(
  accounts: WalletAccount[],
  ledger: LedgerEntry[],
  records: RecordEntry[],
  opening = 1_000_000
): TraceInput {
  return {
    difference: difference(accounts, records, opening),
    accounts,
    ledger,
    records,
    anchorMonthKey: '1405-01',
    anchorAmount: opening,
    anchorStart: START,
    anchorWrittenAtMs: null,
    anchorIsSnapshot: false,
    currentMonthKey: '1405-04',
    today: TODAY
  }
}

describe('traceDiscrepancy', () => {
  it('finds nothing when records and history agree', () => {
    const records = [record('r1', 200_000)]
    const ledger = [row('a', -200_000, 800_000, { recordId: 'r1' })]
    const report = traceDiscrepancy(input([account('a', 800_000)], ledger, records))

    expect(report.difference).toBe(0)
    expect(report.findings).toEqual([])
    expect(report.remainder).toBe(0)
  })

  it('explains a record that names no account', () => {
    const records = [record('r1', 300_000, { accountId: '' })]
    const report = traceDiscrepancy(input([account('a', 1_000_000)], [], records))

    expect(report.difference).toBe(300_000)
    expect(report.findings).toHaveLength(1)
    expect(report.findings[0]).toMatchObject({
      kind: 'no-account',
      group: 'suspect',
      effect: 300_000
    })
    expect(report.remainder).toBe(0)
  })

  it('explains a record whose balance switch is off', () => {
    const records = [record('r1', 150_000, { moved: false })]
    const ledger = [row('a', -150_000, 1_000_000, { recordId: 'r1', applied: false })]
    const report = traceDiscrepancy(input([account('a', 1_000_000)], ledger, records))

    expect(report.findings[0]).toMatchObject({ kind: 'unapplied', effect: 150_000 })
    expect(report.remainder).toBe(0)
  })

  it('explains an amount edited after the balance moved', () => {
    const records = [record('r1', 500_000)]
    const ledger = [row('a', -200_000, 800_000, { recordId: 'r1' })]
    const report = traceDiscrepancy(input([account('a', 800_000)], ledger, records))

    expect(report.findings[0]).toMatchObject({ kind: 'amount-mismatch', effect: 300_000 })
    expect(report.remainder).toBe(0)
  })

  it('explains money moved into a savings goal as a known cause', () => {
    const ledger = [
      row('a', -400_000, 600_000, { source: 'goal-deposit', recordId: 'goal1', title: 'سفر' })
    ]
    const report = traceDiscrepancy(input([account('a', 600_000)], ledger, []))

    expect(report.findings[0]).toMatchObject({ kind: 'goal', group: 'known', effect: -400_000 })
    expect(report.remainder).toBe(0)
  })

  it('flags a typed balance edit', () => {
    const ledger = [row('a', 250_000, 1_250_000, { source: 'اصلاح دستی' })]
    const report = traceDiscrepancy(input([account('a', 1_250_000)], ledger, []))

    expect(report.findings[0]).toMatchObject({ kind: 'manual-balance', effect: 250_000 })
    expect(report.remainder).toBe(0)
  })

  it('finds a balance changed without a history row', () => {
    const ledger = [
      row('a', -100_000, 900_000, { recordId: 'r1' }),
      row('a', -50_000, 850_000, { recordId: 'r2' })
    ]
    const records = [record('r1', 100_000), record('r2', 50_000)]
    // Someone typed +2 000 000 into the sheet: the account no longer follows its history.
    const report = traceDiscrepancy(input([account('a', 2_850_000)], ledger, records))

    expect(report.findings).toHaveLength(1)
    expect(report.findings[0]).toMatchObject({
      kind: 'outside-ledger',
      effect: 2_000_000,
      date: ''
    })
    expect(report.remainder).toBe(0)
  })

  it('cancels a record with no history row against the balance move it left', () => {
    const records = [record('r0', 100_000), record('r1', 120_000)]
    // r1 did take 120 000 off the account, but its history row was never written.
    const ledger = [row('a', -100_000, 900_000, { recordId: 'r0' })]
    const report = traceDiscrepancy(input([account('a', 780_000)], ledger, records))

    expect(report.findings).toEqual([])
    expect(report.remainder).toBe(0)
  })

  it('treats a future-dated record as a cause that fixes itself', () => {
    const records = [record('r1', 90_000, { date: '2026-08-01' })]
    const ledger = [row('a', -90_000, 910_000, { recordId: 'r1', date: '2026-08-01' })]
    const report = traceDiscrepancy(input([account('a', 910_000)], ledger, records))

    expect(report.findings[0]).toMatchObject({
      kind: 'future-dated',
      group: 'known',
      effect: -90_000
    })
    expect(report.remainder).toBe(0)
  })

  it('names an old «اصلاح موجودی» record as a plug', () => {
    const records = [
      record('p1', 700_000, {
        type: 'income',
        accountId: '',
        category: RECONCILIATION_CATEGORY
      })
    ]
    const report = traceDiscrepancy(input([account('a', 1_000_000)], [], records))

    expect(report.findings[0]).toMatchObject({ kind: 'plug', group: 'known', effect: -700_000 })
  })

  it('counts a deleted account that still held money', () => {
    const ledger = [row('gone', 500_000, 500_000, { source: 'موجودی اولیه' })]
    const report = traceDiscrepancy(input([account('a', 1_000_000)], ledger, []))
    const kinds = report.findings.map(item => item.kind)

    expect(kinds).toContain('deleted-account')
    expect(report.findings.find(item => item.kind === 'deleted-account')?.effect).toBe(-500_000)
  })

  it('adds the findings up to the difference and leaves the rest as the remainder', () => {
    const records = [
      record('r1', 300_000, { accountId: '' }),
      record('r2', 40_000, { moved: false })
    ]
    const ledger = [row('a', -40_000, 1_000_000, { recordId: 'r2', applied: false })]
    // The opening is 400 000 too low and nothing in the data shows it.
    const report = traceDiscrepancy(input([account('a', 1_000_000)], ledger, records, 600_000))

    expect(report.difference).toBe(740_000)
    expect(report.explained).toBe(340_000)
    expect(report.remainder).toBe(400_000)
    expect(report.impliedAnchor).toBe(1_000_000)
  })

  it('builds a month-by-month timeline and names the month the drift began', () => {
    const records = [
      record('r1', 300_000, { accountId: '', date: '2026-05-05' }),
      record('r2', 100_000, { accountId: '', date: '2026-06-25' })
    ]
    const report = traceDiscrepancy(input([account('a', 1_000_000)], [], records))
    const withEffect = report.timeline.filter(month => month.count)

    expect(withEffect.map(month => month.monthKey)).toEqual(['1405-02', '1405-04'])
    expect(report.timeline.at(-1)?.cumulative).toBe(400_000)
    expect(report.originMonthKey).toBe('1405-02')
  })

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
