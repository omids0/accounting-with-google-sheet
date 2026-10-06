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

/** category type -> category name -> its subcategories */
export type CategorySubcategoryMap = Record<string, Record<string, string[]>>

export interface AppSettings {
  spreadsheetId: string
  spreadsheets?: SpreadsheetEntry[]
  forms: CustomForm[]
  dangCategories?: string[]
  receivableCategories?: string[]
  personalReminderCategories?: string[]
  vehiclePeriodicCategories?: string[]
  vehicleDeadlineCategories?: string[]
  vehicleMechanicCategories?: string[]
  vehicleExpenseCategories?: string[]
  walletBankCategories?: string[]
  walletAccountKindCategories?: string[]
  categorySubcategories?: CategorySubcategoryMap
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

/** PIN-wrapped data key; see services/appLockVault. */
export interface AppLockVaultConfig {
  v: 1
  salt: string
  iterations: number
  iv: string
  wrappedKey: string
}

/** This device's lock config (local only; no longer synced to Google Sheets). */
export interface AppLockAccountConfig {
  enabled: boolean
  /** Legacy PBKDF2 hash, kept only until the first unlock replaces it with `vault`. */
  pinHash?: string
  pinSalt?: string
  /** Data key wrapped with the PIN; it also encrypts this device's copy of the data. */
  vault?: AppLockVaultConfig
  updatedAt?: string
  /** Google account the stored PIN belongs to. */
  ownerEmail?: string
  /**
   * Number of PIN digits. Missing means a legacy 4-digit PIN; `null` means
   * unknown (PIN arrived from another device through the old sheet sync).
   */
  pinLength?: number | null
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
