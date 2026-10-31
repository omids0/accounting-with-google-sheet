import { describe, expect, it } from 'vitest'

import {
  checkAccount,
  checkIntegrity,
  OUTBOX_STUCK_AFTER_MS,
  type IntegrityInput
} from './integrityCheck'
import type { Transfer } from './transfersModel'
import { account, row } from './walletTraceFixtures'

const NOW = 1_800_000_000_000

const empty: IntegrityInput = {
  accounts: [],
  ledger: [],
  transfers: [],
  records: [],
  outbox: [],
  now: NOW
}

const transfer = (id: string, over: Partial<Transfer> = {}): Transfer => ({
  id,
  createdAt: '',
  date: '2026-07-01',
  fromAccountId: 'a',
  toAccountId: 'b',
  amount: 300_000,
  note: '',
  createdBy: '',
  ...over
})

const leg = (accountId: string, delta: number, after: number, transferId: string) =>
  row(accountId, delta, after, { source: 'transfer', recordId: transferId })

/** An account opened with 1 000 000, then spent 200 000 and earned 50 000. */
const history = () => [
  row('a', 1_000_000, 1_000_000, { source: 'موجودی اولیه', title: 'موجودی اولیه حساب' }),
  row('a', -200_000, 800_000, { title: 'خرید' }),
  row('a', 50_000, 850_000, { title: 'واریز' })
]

describe('checkIntegrity', () => {
  it('reports nothing when stored balances equal their history', () => {
    const report = checkIntegrity({
      ...empty,
      accounts: [account('a', 850_000)],
      ledger: history()
    })

    expect(report.clean).toBe(true)
    expect(report.mismatched).toBe(0)
    expect(report.accounts[0]).toMatchObject({ stored: 850_000, derived: 850_000, difference: 0 })
  })

  it('finds the one account that is off by 500 000 and says where it began', () => {
    const report = checkIntegrity({
      ...empty,
      accounts: [account('a', 1_350_000), account('b', 0)],
      ledger: history()
    })
    const bad = report.accounts.find(item => item.accountId === 'a')

    expect(report.mismatched).toBe(1)
    expect(bad).toMatchObject({ derived: 850_000, difference: 500_000, fixable: true })
    expect(bad?.suspect).toMatchObject({ title: 'واریز', gap: 500_000, afterLast: true })
    expect(report.findings).toHaveLength(1)
    expect(report.findings[0]).toMatchObject({
      kind: 'balance-mismatch',
      severity: 'problem',
      accountId: 'a',
      amount: 500_000
    })
  })

  it('names the history row where a gap opened between two rows, and does not offer a fix', () => {
    // 500 000 arrived with no row; every later row carries it in its balance.
    const ledger = [
      row('a', 1_000_000, 1_000_000, { source: 'موجودی اولیه' }),
      row('a', -200_000, 1_300_000, { title: 'خرید' }),
      row('a', 50_000, 1_350_000, { title: 'واریز' })
    ]
    const check = checkAccount(account('a', 1_350_000), ledger)

    expect(check.difference).toBe(500_000)
    expect(check.suspect).toMatchObject({ title: 'خرید', gap: 500_000, afterLast: false })
    expect(check.fixable).toBe(false)
  })

  it('starts an older account from the balance its first row implies', () => {
    const ledger = [row('a', -100_000, 900_000, { title: 'قدیمی' }), row('a', -50_000, 850_000)]

    expect(checkAccount(account('a', 850_000), ledger)).toMatchObject({
      derived: 850_000,
      difference: 0
    })
  })

  it('ignores rows that left the balance alone (بدون اثر)', () => {
    const ledger = [
      row('a', 1_000_000, 1_000_000, { source: 'موجودی اولیه' }),
      row('a', -300_000, 1_000_000, { source: 'transfer', applied: false })
    ]

    expect(checkAccount(account('a', 1_000_000), ledger).difference).toBe(0)
  })

  it('notes an account with money and no history instead of calling it wrong', () => {
    const report = checkIntegrity({ ...empty, accounts: [account('a', 700_000), account('b', 0)] })

    expect(report.mismatched).toBe(0)
    expect(report.findings.map(item => item.kind)).toEqual(['no-history'])
    expect(report.findings[0].severity).toBe('note')
  })

  it('finds a transfer with only one leg and one with none', () => {
    const ledger = [
      row('a', 1_000_000, 1_000_000, { source: 'موجودی اولیه' }),
      row('b', 0, 0, { source: 'موجودی اولیه' }),
      leg('a', -300_000, 700_000, 't1'),
      leg('a', -300_000, 400_000, 't3'),
      leg('b', 300_000, 300_000, 't3')
    ]
    const report = checkIntegrity({
      ...empty,
      accounts: [account('a', 400_000), account('b', 300_000)],
      ledger,
      transfers: [transfer('t1'), transfer('t2'), transfer('t3')]
    })
    const kinds = report.findings.map(item => [item.kind, item.transferId])

    expect(kinds).toEqual([
      ['transfer-one-leg', 't1'],
      ['transfer-no-leg', 't2']
    ])
  })

  it('finds an id that appears twice in the history and in records', () => {
    const dup = row('a', -10_000, 990_000, { title: 'دوباره' })
    const ledger = [row('a', 1_000_000, 1_000_000, { source: 'موجودی اولیه' }), dup, { ...dup }]
    const report = checkIntegrity({
      ...empty,
      accounts: [account('a', 980_000)],
      ledger,
      records: [
        { id: 'r1', accountId: 'a', type: 'expense', amount: 5 },
        { id: 'r1', accountId: 'a', type: 'expense', amount: 5 }
      ]
    })
    const dups = report.findings.filter(item => item.kind === 'duplicate-id')

    expect(dups.map(item => item.title)).toEqual([
      'شناسهٔ تکراری در «گردش حساب»',
      'شناسهٔ تکراری در «رکوردها»'
    ])
  })

  it('finds a record that names an account that does not exist', () => {
    const report = checkIntegrity({
      ...empty,
      accounts: [account('a', 0)],
      records: [
        { id: 'r1', accountId: 'gone', type: 'expense', amount: 90_000, title: 'قبض' },
        { id: 'r2', accountId: '', type: 'expense', amount: 1 },
        { id: 'r3', accountId: 'a', type: 'income', amount: 2 }
      ]
    })

    expect(report.findings).toHaveLength(1)
    expect(report.findings[0]).toMatchObject({
      kind: 'record-missing-account',
      recordId: 'r1',
      amount: 90_000
    })
  })

  it('finds writes stuck in the outbox but not fresh ones', () => {
    const report = checkIntegrity({
      ...empty,
      outbox: [
        { id: 'fresh', state: 'pending', sheetName: 'رکوردها', attempts: 0, createdAt: NOW - 1000 },
        {
          id: 'old',
          state: 'pending',
          sheetName: 'رکوردها',
          attempts: 1,
          createdAt: NOW - OUTBOX_STUCK_AFTER_MS - 1
        },
        { id: 'retry', state: 'pending', sheetName: 'گردش حساب', attempts: 3, createdAt: NOW },
        {
          id: 'bad',
          state: 'failed',
          sheetName: 'حساب‌ها',
          attempts: 1,
          createdAt: NOW,
          lastError: 'خطا'
        },
        { id: 'both', state: 'conflict', sheetName: 'رکوردها', attempts: 0, createdAt: NOW }
      ]
    })

    expect(report.findings.map(item => item.id)).toEqual([
      'outbox-stuck:old',
      'outbox-stuck:retry',
      'outbox-stuck:bad',
      'outbox-stuck:both'
    ])
    expect(report.findings[2].severity).toBe('problem')
    expect(report.findings[0].severity).toBe('note')
  })

  it('is clean for empty data', () => {
    expect(checkIntegrity(empty)).toEqual({
      accounts: [],
      findings: [],
      mismatched: 0,
      clean: true
    })
  })
})
