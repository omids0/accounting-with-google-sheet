import type { fetchVaultTransactions } from '../../services/treasury'
import type { NewVaultAssetInput } from '../../services/treasuryCatalog'
import type { VaultAssetClass, VaultAssetType } from '../../types'

export type TransactionWithRow = Awaited<ReturnType<typeof fetchVaultTransactions>>[number]

/** `assetType` value of the asset select that opens the inline «دارایی جدید…» fields. */
export const NEW_ASSET_OPTION = '__new__'

export type VaultFormState = {
  assetClass: VaultAssetClass
  assetType: VaultAssetType
  /** Filled when `assetType` is `NEW_ASSET_OPTION`. */
  newAsset: Omit<NewVaultAssetInput, 'assetClass'>
  quantity: number | ''
  unitPrice: number | ''
  transactionDate: string
  note: string
}
