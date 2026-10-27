import { isAuthError } from './auth'
import { whileTransferring } from './transferInFlight'
import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { refreshWalletAccounts } from './walletFresh'
import { appendLedgerEntries, ledgerEntry } from './walletLedger'
import type { WalletAccount } from '../types'
import { roundMoney } from '../utils/roundMoney'

type FreshAccount = WalletAccount & { rowNumber: number }

/** One balance move of a transfer (or of its reversal) and the history lines that describe it. */
export interface TransferLeg {
  accountId: string
  /** Signed change of the account balance. */
  delta: number
  /** «گردش حساب» title of the move. */
  title: string
  /** «گردش حساب» title of the row that takes the move back if a later leg fails. */
  undoTitle: string
}

export interface LegContext {
  /** The transfer row's id: the «شناسه رکورد» of every history row. */
  transferId: string
  date: string
}

/** Some of the writes of a transfer failed. `rolledBack`: the earlier ones were taken back. */
export class TransferWriteError extends Error {
  constructor(message: string, readonly rolledBack: boolean, readonly failure: unknown) {
    super(message)
    this.name = 'TransferWriteError'
  }
}

/** Whether a failure thrown by  left nothing of the transfer's balance moves behind. */
export function wasRolledBack(failure: unknown): boolean {
  return (failure as { rolledBack?: unknown } | null)?.rolledBack === true
}

export const ACCOUNT_GONE_MESSAGE = 'حساب پیدا نشد؛ احتمالاً در دستگاه دیگری حذف شده است.'

/**
 * The account as the sheet holds it now (one row re-read first, like every other balance move),
 * so the change lands on the real balance and is sent as a change another device's move survives.
 */
export async function readFreshAccount(
  spreadsheetId: string,
  accountId: string
): Promise<FreshAccount | undefined> {
  const gone = await refreshWalletAccounts(spreadsheetId, [accountId])

  if (gone.size) return undefined

  return (await fetchWalletAccounts(spreadsheetId)).find(account => account.id === accountId)
}

interface LegProgress {
  /** The balance write was made. */
  balance: boolean
  /** The history row was appended. */
  ledger: boolean
}

async function moveBalance(
  spreadsheetId: string,
  account: FreshAccount,
  delta: number,
  title: string,
  context: LegContext,
  progress?: LegProgress
): Promise<void> {
  const balanceAfter = roundMoney(account.balance + delta)

  await updateWalletAccount(
    spreadsheetId,
    { ...account, balance: balanceAfter },
    { mergeBalance: true }
  )
  if (progress) progress.balance = true
  // Appended (not «logLedger»): a lost history row must fail the transfer, not just warn.
  await appendLedgerEntries(spreadsheetId, [
    ledgerEntry(account.id, delta, balanceAfter, {
      title,
      date: context.date,
      source: 'transfer',
      recordId: context.transferId
    })
  ])
  if (progress) progress.ledger = true
}

/** Takes one finished leg back: the balance returns, and a history row says so if the leg had one. */
async function undoLeg(
  spreadsheetId: string,
  leg: TransferLeg,
  context: LegContext,
  progress: LegProgress
): Promise<void> {
  if (!progress.balance) return

  const account = await readFreshAccount(spreadsheetId, leg.accountId)

  if (!account) return
  if (progress.ledger) {
    await moveBalance(spreadsheetId, account, -leg.delta, leg.undoTitle, context)

    return
  }
  await updateWalletAccount(
    spreadsheetId,
    { ...account, balance: roundMoney(account.balance - leg.delta) },
    { mergeBalance: true }
  )
}

/**
 * Applies every leg in order, each on the balance read fresh just before (`known` are rows already
 * read this call, so a leg does not read them twice). If one leg fails, the ones before it are
 * taken back as well as possible; `wasRolledBack(error)` tells whether that worked. An auth error is
 * rethrown with its own message so the caller can ask the user to sign in.
 */
export function applyLegs(
  spreadsheetId: string,
  legs: TransferLeg[],
  context: LegContext,
  known: FreshAccount[] = []
): Promise<void> {
  return whileTransferring(() => applyLegsNow(spreadsheetId, legs, context, known))
}

async function applyLegsNow(
  spreadsheetId: string,
  legs: TransferLeg[],
  context: LegContext,
  known: FreshAccount[]
): Promise<void> {
  const progress = legs.map<LegProgress>(() => ({ balance: false, ledger: false }))

  try {
    for (const [index, leg] of legs.entries()) {
      const account =
        known.find(item => item.id === leg.accountId) ??
        (await readFreshAccount(spreadsheetId, leg.accountId))

      if (!account) throw new Error(ACCOUNT_GONE_MESSAGE)
      await moveBalance(spreadsheetId, account, leg.delta, leg.title, context, progress[index])
    }
  } catch (failure) {
    let rolledBack = true

    for (const [index, leg] of legs.entries()) {
      try {
        await undoLeg(spreadsheetId, leg, context, progress[index])
      } catch {
        rolledBack = false
      }
    }
    // An auth error keeps its own shape so the caller can ask the user to sign in again.
    if (isAuthError(failure)) {
      throw Object.assign(failure instanceof Error ? failure : new Error(String(failure)), {
        rolledBack
      })
    }
    throw new TransferWriteError(
      rolledBack
        ? 'انتقال ثبت نشد و تغییرها برگردانده شد. دوباره تلاش کنید.'
        : 'انتقال نیمه‌کاره ماند؛ موجودی حساب‌ها را در «گردش حساب» بررسی کنید.',
      rolledBack,
      failure
    )
  }
}
