import type { fetchVaultTransactions } from '../../services/treasury'
import type { VaultAssetType } from '../../types'

export type TransactionWithRow = Awaited<ReturnType<typeof fetchVaultTransactions>>[number]

export type VaultFormState = {
  assetType: VaultAssetType
  quantity: number | ''
  unitPrice: number | ''
  transactionDate: string
  note: string
}
