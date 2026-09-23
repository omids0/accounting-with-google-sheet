import { saveCategoryGroupOnSheet } from './categories'
import { getDefaultSettings, getSettings, saveSettings } from './settings'

export const WALLET_ACCOUNT_KIND_BANK = 'بانکی'
export const WALLET_ACCOUNT_KIND_CASH = 'نقدی'
export const WALLET_ACCOUNT_KIND_OTHER = 'سایر'

export const DEFAULT_WALLET_ACCOUNT_KIND_CATEGORIES = [
  WALLET_ACCOUNT_KIND_BANK,
  WALLET_ACCOUNT_KIND_CASH,
  WALLET_ACCOUNT_KIND_OTHER
]

/** Seed list for the user-managed bank picker; mirrors IRANIAN_BANKS' labels in banks.ts. */
export const DEFAULT_WALLET_BANK_CATEGORIES = [
  'بلو بانک',
  'های‌بانک',
  'بانک ملی',
  'بانک ملت',
  'بانک صادرات',
  'بانک تجارت',
  'بانک پاسارگاد',
  'بانک پارسیان',
  'بانک سامان',
  'بانک سپه',
  'بانک مسکن',
  'بانک کشاورزی',
  'بانک رفاه',
  'بانک شهر',
  'بانک آینده',
  'بانک گردشگری',
  'بانک سینا',
  'بانک اقتصاد نوین',
  'بانک کارآفرین',
  'بانک رسالت',
  'بانک دی',
  'پست بانک'
]

const LEGACY_ACCOUNT_KIND_LABELS: Record<string, string> = {
  bank: WALLET_ACCOUNT_KIND_BANK,
  cash: WALLET_ACCOUNT_KIND_CASH,
  other: WALLET_ACCOUNT_KIND_OTHER
}

/** Maps a legacy 'bank'/'cash'/'other' code to its label; passes a label (built-in or custom) through. */
export function resolveWalletAccountKindLabel(raw: string): string {
  return LEGACY_ACCOUNT_KIND_LABELS[raw] ?? (raw || WALLET_ACCOUNT_KIND_OTHER)
}

export function getWalletAccountKindCategories(): string[] {
  const stored = getSettings()?.walletAccountKindCategories

  return stored?.length ? stored : [...DEFAULT_WALLET_ACCOUNT_KIND_CATEGORIES]
}

export function updateWalletAccountKindCategories(categories: string[]): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, walletAccountKindCategories: categories })
}

export async function saveWalletAccountKindCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  await saveCategoryGroupOnSheet(spreadsheetId, { walletAccountKind: categories })
  updateWalletAccountKindCategories(categories)
}

export function getWalletBankCategories(): string[] {
  const stored = getSettings()?.walletBankCategories

  return stored?.length ? stored : [...DEFAULT_WALLET_BANK_CATEGORIES]
}

export function updateWalletBankCategories(categories: string[]): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, walletBankCategories: categories })
}

export async function saveWalletBankCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  await saveCategoryGroupOnSheet(spreadsheetId, { walletBank: categories })
  updateWalletBankCategories(categories)
}
