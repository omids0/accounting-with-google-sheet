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

export type VaultAssetType = 'sekeb' | 'sekee' | 'nim' | 'rob' | 'gerami' | 'geram18' | 'usd'

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
