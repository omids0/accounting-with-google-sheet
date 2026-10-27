import {
  DELETED_ACCOUNT_TITLE,
  transferIsReversible,
  type Transfer
} from '../../../services/transfers'
import type { WalletAccount } from '../../../types'
import type { ConfirmDeleteOptions } from '../../../utils/confirmDelete'
import { formatMoney } from '../../../utils/formatMoney'

/** The delete question of a transfer: what goes, and what happens to the two balances. */
export function transferDeleteQuestion(
  transfer: Transfer,
  accounts: WalletAccount[]
): ConfirmDeleteOptions {
  const nameOf = (id: string) =>
    accounts.find(account => account.id === id)?.title.trim() || DELETED_ACCOUNT_TITLE
  const from = nameOf(transfer.fromAccountId)
  const to = nameOf(transfer.toAccountId)

  return {
    // Short: it becomes the dialog title («… حذف شود؟»); the amount is in the message.
    label: `«انتقال ${from} به ${to}»`,
    message: transferIsReversible(transfer, accounts)
      ? `با حذف این انتقال، ${formatMoney(
          transfer.amount
        )} به «${from}» برمی‌گردد و از «${to}» کم می‌شود. حذف را نمی‌شود بازگرداند؛ اگر لازم شد، انتقال را دوباره ثبت کن.`
      : 'یکی از حساب‌های این انتقال حذف شده است؛ فقط خود ردیف انتقال پاک می‌شود و موجودی هیچ حسابی تغییر نمی‌کند.'
  }
}
