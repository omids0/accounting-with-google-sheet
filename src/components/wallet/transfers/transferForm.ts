import { SAME_ACCOUNT_MESSAGE } from '../../../services/transfers'
import type { WalletAccount } from '../../../types'
import { formatMoney } from '../../../utils/formatMoney'
import { validatePositiveAmount } from '../../../utils/formValidation'

/** The «انتقال» form as the user fills it. */
export interface TransferDraft {
  fromAccountId: string
  toAccountId: string
  amount: number | ''
  /** `YYYY-MM-DD` */
  date: string
  note: string
}

export type TransferField = 'from' | 'to' | 'amount' | 'date'

export type TransferErrors = Partial<Record<TransferField, string>>

export const FROM_REQUIRED_MESSAGE = 'حساب مبدأ را انتخاب کنید'

export const TO_REQUIRED_MESSAGE = 'حساب مقصد را انتخاب کنید'

export const DATE_REQUIRED_MESSAGE = 'تاریخ را انتخاب کنید'

/** One message per wrong field; empty when the draft can be sent. */
export function validateTransferDraft(draft: TransferDraft): TransferErrors {
  const errors: TransferErrors = {}
  const amount = validatePositiveAmount(draft.amount)

  if (!draft.fromAccountId) errors.from = FROM_REQUIRED_MESSAGE

  if (!draft.toAccountId) errors.to = TO_REQUIRED_MESSAGE
  else if (draft.toAccountId === draft.fromAccountId) errors.to = SAME_ACCOUNT_MESSAGE

  if (amount !== true) errors.amount = amount
  if (!draft.date) errors.date = DATE_REQUIRED_MESSAGE

  return errors
}

/**
 * A note under the amount when the transfer takes more than the source holds. It never blocks:
 * a balance may go negative (a card used before the deposit is entered).
 */
export function transferOverdraftHint(
  draft: Pick<TransferDraft, 'fromAccountId' | 'amount'>,
  accounts: Pick<WalletAccount, 'id' | 'balance'>[]
): string {
  const amount = Number(draft.amount)
  const from = accounts.find(account => account.id === draft.fromAccountId)

  if (!from || !(amount > 0) || amount <= from.balance) return ''

  return `موجودی حساب مبدأ (${formatMoney(
    from.balance
  )}) از این مبلغ کمتر است؛ بعد از انتقال منفی می‌شود`
}

/** A transfer needs two accounts to move money between. */
export function canTransferBetween(accounts: unknown[]): boolean {
  return accounts.length >= 2
}
