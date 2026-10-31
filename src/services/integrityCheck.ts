import {
  duplicateFindings,
  nameOf,
  outboxFindings,
  recordFindings,
  transferFindings
} from './integrityFindings'
import type {
  AccountIntegrity,
  IntegrityFinding,
  IntegrityInput,
  IntegrityReport,
  SuspectEntry
} from './integrityTypes'
import type { LedgerEntry } from './walletLedger'
import { isSignificant, ledgerDelta } from './walletTraceRecords'
import type { WalletAccount } from '../types'
import { roundMoney } from '../utils/roundMoney'

export * from './integrityTypes'

/** The history of one account in the order it was written, checked row by row. */
export function checkAccount(account: WalletAccount, ledger: LedgerEntry[]): AccountIntegrity {
  const entries = ledger.filter(entry => entry.accountId === account.id)
  const base = {
    accountId: account.id,
    title: nameOf(account),
    stored: roundMoney(account.balance),
    entryCount: entries.length
  }

  if (!entries.length) {
    return { ...base, derived: null, difference: 0, suspect: null, fixable: false }
  }

  const first = entries[0]
  const opening = roundMoney(first.balanceAfter - ledgerDelta(first))
  const derived = roundMoney(entries.reduce((sum, entry) => sum + ledgerDelta(entry), opening))
  const difference = roundMoney(base.stored - derived)

  const off = isSignificant(difference)
  const suspect = off ? firstSuspect(entries, base.stored) : null

  return {
    ...base,
    derived,
    difference: off ? difference : 0,
    suspect,
    fixable: suspect?.afterLast === true
  }
}

function firstSuspect(entries: LedgerEntry[], stored: number): SuspectEntry | null {
  for (let index = 1; index < entries.length; index += 1) {
    const entry = entries[index]
    const gap = roundMoney(
      entry.balanceAfter - ledgerDelta(entry) - entries[index - 1].balanceAfter
    )

    if (isSignificant(gap)) {
      return { entryId: entry.id, title: entry.title, date: entry.date, gap, afterLast: false }
    }
  }

  const last = entries[entries.length - 1]
  const tail = roundMoney(stored - last.balanceAfter)

  return isSignificant(tail)
    ? { entryId: last.id, title: last.title, date: last.date, gap: tail, afterLast: true }
    : null
}

function accountFindings(checks: AccountIntegrity[]): IntegrityFinding[] {
  return checks.flatMap<IntegrityFinding>(check => {
    if (check.derived === null) {
      return isSignificant(check.stored)
        ? [
            {
              id: `no-history:${check.accountId}`,
              kind: 'no-history',
              severity: 'note',
              title: `«${check.title}» گردش حساب ندارد`,
              detail: 'موجودی دارد ولی هیچ ردیفی در گردش حساب نیست، پس چیزی برای مقایسه نیست.',
              accountId: check.accountId,
              amount: check.stored
            }
          ]
        : []
    }
    if (!check.difference) return []

    return [
      {
        id: `balance-mismatch:${check.accountId}`,
        kind: 'balance-mismatch',
        severity: 'problem',
        title: `موجودی «${check.title}» با گردشش نمی‌خواند`,
        detail: 'موجودی ثبت‌شده با جمع گردش حساب برابر نیست.',
        accountId: check.accountId,
        amount: check.difference
      }
    ]
  })
}

/** Compares every account with its history and lists what else looks broken. */
export function checkIntegrity(input: IntegrityInput): IntegrityReport {
  const accounts = input.accounts.map(account => checkAccount(account, input.ledger))
  const findings = [
    ...accountFindings(accounts),
    ...transferFindings(input.transfers, input.ledger, input.accounts),
    ...duplicateFindings(input),
    ...recordFindings(input.records, input.accounts),
    ...outboxFindings(input.outbox, input.now)
  ]

  return {
    accounts,
    findings,
    mismatched: accounts.filter(account => account.difference !== 0).length,
    clean: findings.length === 0
  }
}
