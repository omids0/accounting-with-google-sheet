export interface InstallmentPayment {
  n: number
  paid: boolean
  paidAt: string
  dueDate: string
  amount?: number
  transactionRecordId?: string
}

export interface InstallmentPlan {
  id: string
  createdAt: string
  title: string
  subCategory?: string
  amount: number
  count: number
  dueDay: number
  startDate: string
  note: string
  payments: InstallmentPayment[]
  /** Drive ids of its receipts (column «پیوست»). */
  attachments?: string[]
}

export interface Dang {
  id: string
  createdAt: string
  title: string
  category: string
  subCategory?: string
  counterparty: string
  amount: number
  date: string
  note: string
  paid: boolean
  paidAt: string
  transactionRecordId?: string
}

export interface Check {
  id: string
  createdAt: string
  checkNumber: string
  subCategory?: string
  counterparty: string
  amount: number
  creationDate: string
  dueDate: string
  paid: boolean
  paidAt: string
  transactionRecordId?: string
  /** Drive ids of its receipts (column «پیوست»). */
  attachments?: string[]
}

export interface ReceivablePayment {
  id: string
  amount: number
  paidAt: string
  note: string
  transactionRecordId?: string
}

export interface Receivable {
  id: string
  createdAt: string
  title: string
  debtor: string
  category: string
  subCategory?: string
  amount: number
  borrowDate: string
  note: string
  payments: ReceivablePayment[]
}

/** The seven assets the vault knew before the catalog; their ids are still valid catalog ids. */
export type LegacyVaultAssetId = 'sekeb' | 'sekee' | 'nim' | 'rob' | 'gerami' | 'geram18' | 'usd'

/** Id of a row in the vault asset catalog (a legacy id for the built-in assets). */
export type VaultAssetType = string

export type VaultAssetClass = 'gold' | 'currency' | 'stock' | 'crypto' | 'other'

export type VaultPriceSource = 'tgju' | 'manual'

/** One row of the «دارایی_صندوقچه» catalog. */
export interface VaultAsset {
  id: string
  assetClass: VaultAssetClass
  symbol: string
  name: string
  unit: string
  /** Fraction digits allowed in quantities (0 = whole units). */
  decimals: number
  priceSource: VaultPriceSource
  tgjuKey: string
  /** In the display currency; used when `priceSource` is manual. */
  manualPrice: number
  /** ISO date of the last manual price. */
  manualPriceAt: string
  /** Inactive assets are hidden from the add form; holdings still show. */
  active: boolean
}

export type VaultAction = 'buy' | 'sell'

export interface VaultTransaction {
  id: string
  createdAt: string
  assetType: VaultAssetType
  action: VaultAction
  quantity: number
  unitPrice: number
  transactionDate: string
  note: string
}

export interface VaultHolding {
  assetType: VaultAssetType
  asset: VaultAsset
  netQuantity: number
  currentUnitPrice: number
  totalValue: number
  transactions: VaultTransaction[]
}

export type WalletAccountKind = 'bank' | 'cash' | 'other'

export interface WalletAccount {
  id: string
  createdAt: string
  title: string
  balance: number
  note: string
  /** The wallet-account-kind category label (or a legacy 'bank'/'cash'/'other' code). */
  accountKind: string
  bankId: string
  cardNumber: string
  cardHolder: string
  cardColor: string
  cardColorPrimary: string
  cardColorSecondary: string
  iban: string
  accountNumber: string
}
