import type { FundAccountDraft } from './journeyDraft'
import { cardLabel } from '../../services/bankSmsRouting'
import type { WalletAccount } from '../../types'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { resolveAccountKind } from '../wallet/walletCardUtils'

type AccountLike = Pick<WalletAccount, 'accountKind' | 'cardNumber'>

const cardDigits = (account: AccountLike) => normalizeDigits(account.cardNumber).replace(/\D/g, '')

/** «کارت ۶۱۰۴…۳۲۱۰» for a bank account with a card, «بانکی» without one, «نقدی» for cash. */
export function fundAccountMeta(account: AccountLike): string {
  if (resolveAccountKind(account) === 'cash') return 'نقدی'

  const digits = cardDigits(account)

  return digits ? `کارت ${cardLabel(digits)}` : 'بانکی'
}

/** The account as the account sheet edits it (the key is the account's own id). */
export function fundAccountDraft(
  account: Pick<WalletAccount, 'id' | 'title' | 'balance' | 'accountKind' | 'cardNumber'>
): FundAccountDraft {
  const bank = resolveAccountKind(account) !== 'cash'

  return {
    key: account.id,
    title: account.title,
    type: bank ? 'bank' : 'cash',
    cardNumber: bank ? cardDigits(account) : '',
    balance: account.balance
  }
}
