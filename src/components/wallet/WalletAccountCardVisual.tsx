import type { WalletAccountWithRow } from './types'
import WalletBankCardVisual from './WalletBankCardVisual'
import { resolveAccountKind } from './walletCardUtils'
import WalletCashCardVisual from './WalletCashCardVisual'
import WalletGenericCardVisual from './WalletGenericCardVisual'

type WalletAccountCardVisualProps = {
  account: Pick<
    WalletAccountWithRow,
    | 'title'
    | 'balance'
    | 'accountKind'
    | 'bankId'
    | 'cardNumber'
    | 'cardHolder'
    | 'cardColor'
    | 'cardColorPrimary'
    | 'cardColorSecondary'
    | 'note'
    | 'iban'
    | 'accountNumber'
  >
  displayBalance?: number
  compact?: boolean
  className?: string
  /** Bank cards only: show the full number (e.g. the form preview). */
  maskCardNumber?: boolean
}

export default function WalletAccountCardVisual({
  maskCardNumber,
  ...props
}: WalletAccountCardVisualProps) {
  const kind = resolveAccountKind(props.account)

  if (kind === 'cash') return <WalletCashCardVisual {...props} />
  if (kind === 'bank') return <WalletBankCardVisual {...props} maskCardNumber={maskCardNumber} />

  return <WalletGenericCardVisual {...props} />
}
