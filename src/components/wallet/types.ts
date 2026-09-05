import type { WalletAccount } from '../../types'

export type WalletAccountWithRow = WalletAccount & { rowNumber: number }

export type WalletPageProps = {
  active?: boolean
}

export type WalletFormState = {
  title: string
  balance: number | ''
  note: string
}
