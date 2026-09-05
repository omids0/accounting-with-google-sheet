export type FieldType = 'text' | 'number' | 'date' | 'select'

export type FormType = 'income' | 'expense' | 'custom'

export interface FieldConfig {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

export interface CustomForm {
  id: string
  name: string
  sheetName: string
  type: FormType
  fields: FieldConfig[]
}

export type CurrencyUnit = 'toman' | 'rial' | 'usd' | 'eur'

export type ThemeMode = 'light' | 'dark'

export interface SpreadsheetEntry {
  id: string
  name: string
  createdAt: string
}

export interface NetAvailableAssetConfig {
  wallet: boolean
  treasury: boolean
  receivables: boolean
}

export interface NetAvailableLiabilityConfig {
  installments: boolean
  dangs: boolean
  checks: boolean
}

export interface NetAvailableConfig {
  assets: NetAvailableAssetConfig
  liabilities: NetAvailableLiabilityConfig
}

export interface AppSettings {
  spreadsheetId: string
  spreadsheets?: SpreadsheetEntry[]
  forms: CustomForm[]
  dangCategories?: string[]
  receivableCategories?: string[]
  currency?: CurrencyUnit
  theme?: ThemeMode
  netAvailableConfig?: NetAvailableConfig
}

export interface GoogleSession {
  email: string
  name: string
  picture?: string
  accessToken: string
  tokenExpiry: number
}

/** Account-wide lock config synced via Google Sheets */
export interface AppLockAccountConfig {
  enabled: boolean
  pinHash: string
  pinSalt: string
  updatedAt?: string
}

/** When the app should ask for the PIN again (per-device preference). */
export type AppLockPolicy = 'background' | 'session' | 'always' | 'idle' | 'manual'

/** Per-device biometric config (local only) */
export interface AppLockDeviceConfig {
  biometricEnabled?: boolean
  credentialId?: string
  lockPolicy?: AppLockPolicy
  idleMinutes?: number
}

/** @deprecated Use AppLockAccountConfig + AppLockDeviceConfig */
export interface AppLockConfig extends AppLockAccountConfig {
  biometricEnabled?: boolean
  credentialId?: string
}

export interface RecordRow {
  id: string
  createdAt: string
  values: Record<string, string>
}
