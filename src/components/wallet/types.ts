import type { WalletAccount, WalletAccountKind } from '../../types'

export type WalletAccountWithRow = WalletAccount & { rowNumber: number }

export type WalletPageProps = {
  active?: boolean
}
export type WalletFormState = {
  title: string
  balance: number | ''
  note: string
  accountKind: WalletAccountKind
  bankId: string
  cardNumber: string
  cardHolder: string
  cardColor: string
  cardColorPrimary: string
  cardColorSecondary: string
  iban: string
  accountNumber: string
}
