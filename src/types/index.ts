export type FieldType = 'text' | 'number' | 'date' | 'select';

export type FormType = 'income' | 'expense' | 'custom';

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface CustomForm {
  id: string;
  name: string;
  sheetName: string;
  type: FormType;
  fields: FieldConfig[];
}

export type CurrencyUnit = 'toman' | 'rial' | 'usd' | 'eur';

export interface SpreadsheetEntry {
  id: string;
  name: string;
  createdAt: string;
}

export interface AppSettings {
  spreadsheetId: string;
  spreadsheets?: SpreadsheetEntry[];
  forms: CustomForm[];
  currency?: CurrencyUnit;
}

export interface GoogleSession {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  tokenExpiry: number;
}

export interface RecordRow {
  id: string;
  createdAt: string;
  values: Record<string, string>;
}

export interface CategorySummary {
  name: string;
  total: number;
}

export interface DashboardRecord {
  formName: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export interface FinancialSummary {
  walletTotal: number;
  treasuryTotal: number;
  receivablesTotal: number;
  totalAssets: number;
  installmentsTotal: number;
  netAvailable: number;
}

export interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  openingBalance: number;
  periodBalance: number;
  reconciliationDiff: number;
  monthKey: string;
  monthLabel: string;
  financial: FinancialSummary;
  incomeByCategory: CategorySummary[];
  expenseByCategory: CategorySummary[];
  recentRecords: DashboardRecord[];
}

export interface InstallmentPayment {
  n: number;
  paid: boolean;
  paidAt: string;
  dueDate: string;
}

export interface InstallmentPlan {
  id: string;
  createdAt: string;
  title: string;
  amount: number;
  count: number;
  dueDay: number;
  startDate: string;
  note: string;
  payments: InstallmentPayment[];
}

export interface Dang {
  id: string;
  createdAt: string;
  title: string;
  counterparty: string;
  amount: number;
  date: string;
  note: string;
  paid: boolean;
  paidAt: string;
}

export interface Check {
  id: string;
  createdAt: string;
  checkNumber: string;
  counterparty: string;
  amount: number;
  creationDate: string;
  dueDate: string;
  paid: boolean;
  paidAt: string;
}

export interface ReceivablePayment {
  id: string;
  amount: number;
  paidAt: string;
  note: string;
}

export interface Receivable {
  id: string;
  createdAt: string;
  debtor: string;
  amount: number;
  borrowDate: string;
  note: string;
  payments: ReceivablePayment[];
}

export type VaultAssetType =
  | 'sekeb'
  | 'sekee'
  | 'nim'
  | 'rob'
  | 'gerami'
  | 'geram18'
  | 'usd';

export type VaultAction = 'buy' | 'sell';

export interface VaultTransaction {
  id: string;
  createdAt: string;
  assetType: VaultAssetType;
  action: VaultAction;
  quantity: number;
  unitPrice: number;
  transactionDate: string;
  note: string;
}

export interface VaultHolding {
  assetType: VaultAssetType;
  netQuantity: number;
  currentUnitPrice: number;
  totalValue: number;
  transactions: VaultTransaction[];
}

export interface WalletAccount {
  id: string;
  createdAt: string;
  title: string;
  balance: number;
  note: string;
}
