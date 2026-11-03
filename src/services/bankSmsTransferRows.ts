import type { LedgerEntry } from './recordDuplicates'
import type { Transfer } from './transfersModel'
import { diffIsoDays, toIsoDate } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

/** The note of a transfer registered from a bank-SMS pair. */
export const SMS_TRANSFER_NOTE = 'از پیامک'

/** The id of the transfer made from this pair: the same pair always gives the same transfer. */
export function smsTransferId(debitSmsId: string, creditSmsId: string): string {
  return `sms-transfer-${debitSmsId}-${creditSmsId}`
}

/** What the review needs of one SMS of a pair. */
interface PairSms {
  sms: { id: string; receivedAt: number }
  result: { accountId: string }
  amount: number
}

/** Transfers match an SMS pair within a day, like the income/expense records do. */
const TRANSFER_DUPLICATE_DAYS = 1

/**
 * The transfer in «انتقال‌ها» that this debit/credit SMS pair already stands for: the one made from
 * this very pair, or a hand-made one between the same two accounts (same direction) for the same
 * amount within a day. One transfer matches one pair (`taken`: those earlier pairs of the list took).
 */
export function transferOfSmsPair(
  debit: PairSms,
  credit: PairSms,
  transfers: readonly Transfer[],
  taken: ReadonlySet<string>
): Transfer | null {
  const day = toIsoDate(new Date(debit.sms.receivedAt))
  const own = smsTransferId(debit.sms.id, credit.sms.id)

  return (
    transfers.find(
      transfer =>
        !taken.has(transfer.id) &&
        (transfer.id === own ||
          (transfer.fromAccountId === debit.result.accountId &&
            transfer.toAccountId === credit.result.accountId &&
            roundMoney(transfer.amount) === roundMoney(debit.amount) &&
            Boolean(transfer.date) &&
            Math.abs(diffIsoDays(transfer.date, day)) <= TRANSFER_DUPLICATE_DAYS))
    ) ?? null
  )
}

/**
 * The two legs of a transfer as the records the pair card compares with, so the shared «قبلاً ثبت
 * شده» close works for a transfer too: the withdrawal from the source, the deposit to the target.
 */
export function transferLegRecords(transfer: Transfer): {
  debit: LedgerEntry
  credit: LedgerEntry
} {
  const leg = (type: LedgerEntry['type'], accountId: string): LedgerEntry => ({
    type,
    amount: transfer.amount,
    date: transfer.date,
    accountId,
    id: transfer.id,
    title: 'انتقال',
    note: transfer.note
  })

  return {
    debit: leg('expense', transfer.fromAccountId),
    credit: leg('income', transfer.toAccountId)
  }
}
