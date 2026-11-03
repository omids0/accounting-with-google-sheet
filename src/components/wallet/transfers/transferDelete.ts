import {
  DELETED_ACCOUNT_TITLE,
  transferIsReversible,
  type Transfer,
  type TransferLegInfo
} from '../../../services/transfers'
import type { WalletAccount } from '../../../types'
import type { ConfirmDeleteOptions } from '../../../utils/confirmDelete'
import { formatMoney } from '../../../utils/formatMoney'

/** The part of the question that says what happens to the balances, from which moves really exist. */
function balanceMessage(
  transfer: Transfer,
  accounts: WalletAccount[],
  legs: TransferLegInfo | undefined,
  from: string,
  to: string
): string {
  const amount = formatMoney(transfer.amount)
  const moved = legs?.movedAccountIds
  const gone = (id: string) => !accounts.some(account => account.id === id)

  // A phantom: the save was cut off before any money moved, so there is nothing to give back.
  if (legs && moved?.length === 0) {
    return 'این انتقال هرگز موجودی را تغییر نداده؛ فقط ردیف آن حذف می‌شود.'
  }
  // The money of a deleted account left with it: giving back only the other side would create money.
  if (moved ? moved.some(gone) : !transferIsReversible(transfer, accounts)) {
    return 'یکی از حساب‌های این انتقال حذف شده است؛ فقط خود ردیف انتقال پاک می‌شود و موجودی هیچ حسابی تغییر نمی‌کند.'
  }
  if (moved?.length === 1) {
    const sourceSide = moved[0] === transfer.fromAccountId

    return `فقط یک سمت این انتقال موجودی را تغییر داده بود. با حذف آن، ${
      sourceSide
        ? `${amount} به «${from}» برمی‌گردد و موجودی «${to}» تغییری نمی‌کند.`
        : `${amount} از «${to}» کم می‌شود و موجودی «${from}» تغییری نمی‌کند.`
    }`
  }

  return `با حذف این انتقال، ${amount} به «${from}» برمی‌گردد و از «${to}» کم می‌شود. حذف را نمی‌شود بازگرداند؛ اگر لازم شد، انتقال را دوباره ثبت کن.`
}

/**
 * The delete question of a transfer: what goes, and what happens to the two balances. `legs` says
 * which balance moves of the transfer exist (unknown: the full two-sided wording).
 */
export function transferDeleteQuestion(
  transfer: Transfer,
  accounts: WalletAccount[],
  legs?: TransferLegInfo
): ConfirmDeleteOptions {
  const nameOf = (id: string) =>
    accounts.find(account => account.id === id)?.title.trim() || DELETED_ACCOUNT_TITLE
  const from = nameOf(transfer.fromAccountId)
  const to = nameOf(transfer.toAccountId)

  return {
    // Short: it becomes the dialog title («… حذف شود؟»); the amount is in the message.
    label: `«انتقال ${from} به ${to}»`,
    message: balanceMessage(transfer, accounts, legs, from, to)
  }
}
