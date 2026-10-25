import type { LedgerEntry as RecordEntry } from './recordDuplicates'
import type { LedgerEntry } from './walletLedger'
import type { TraceInput } from './walletTraceTypes'
import type { WalletAccount } from '../types'

// 1405-01 (فروردین) starts on 2026-03-21; «today» is in 1405-04 (تیر).
export const START = '2026-03-21'
export const TODAY = '2026-07-01'

export function account(id: string, balance: number, title = id): WalletAccount {
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

export function row(
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

export function record(id: string, amount: number, extra: Partial<RecordEntry> = {}): RecordEntry {
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
export function difference(
  accounts: WalletAccount[],
  records: RecordEntry[],
  opening: number
): number {
  const wallet = accounts.reduce((sum, item) => sum + item.balance, 0)
  const net = records
    .filter(item => item.date >= START && item.date <= TODAY)
    .reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0)

  return wallet - (opening + net)
}

export function input(
  accounts: WalletAccount[],
  ledger: LedgerEntry[],
  records: RecordEntry[],
  opening = 1_000_000
): TraceInput {
  return {
    difference: difference(accounts, records, opening),
    openingShifts: [],
    history: [],
    events: [],
    eventsOldestAt: null,
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
