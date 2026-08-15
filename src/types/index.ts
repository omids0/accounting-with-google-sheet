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

export interface AppSettings {
  spreadsheetId: string;
  forms: CustomForm[];
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

export interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: CategorySummary[];
  expenseByCategory: CategorySummary[];
  recentRecords: { formName: string; title: string; amount: number; type: FormType; createdAt: string }[];
}
