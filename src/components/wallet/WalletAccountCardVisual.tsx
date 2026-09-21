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
}

export default function WalletAccountCardVisual(props: WalletAccountCardVisualProps) {
  const kind = resolveAccountKind(props.account)

  if (kind === 'cash') return <WalletCashCardVisual {...props} />
  if (kind === 'bank') return <WalletBankCardVisual {...props} />

  return <WalletGenericCardVisual {...props} />
}
