import type { SelectOption } from './Select'
import type { WalletAccount } from '../../types'

export const NO_ACCOUNT_LABEL = 'بدون حساب (موجودی تغییر نمی‌کند)'

export const DELETED_ACCOUNT_LABEL = 'حساب حذف‌شده'

/**
 * The options of a wallet-account select: «بدون حساب» first (unless `allowNone` is off), every
 * account except `excludeId`, and a stand-in for a chosen account that was deleted since.
 */
export function walletAccountOptions({
  accounts,
  value,
  allowNone = true,
  excludeId
}: {
  accounts: Pick<WalletAccount, 'id' | 'title'>[]
  value: string
  allowNone?: boolean
  /** Left out of the list, so two selects can never name the same account. */
  excludeId?: string
}): SelectOption[] {
  return [
    ...(allowNone ? [{ value: '', label: NO_ACCOUNT_LABEL }] : []),
    ...accounts
      .filter(account => !excludeId || account.id !== excludeId)
      .map(account => ({ value: account.id, label: account.title })),
    // A record may name an account that was deleted since.
    ...(value && !accounts.some(account => account.id === value)
      ? [{ value, label: DELETED_ACCOUNT_LABEL }]
      : [])
  ]
}
