import { EXCHANGE_CURRENCY_OPTIONS } from './tgju'
import type { LegacyVaultAssetId, VaultAsset, VaultAssetClass } from '../types'
import { diffIsoDays, getTodayIso } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'

/** Chip and section order. */
export const VAULT_ASSET_CLASSES: { id: VaultAssetClass; label: string }[] = [
  { id: 'gold', label: 'طلا' },
  { id: 'currency', label: 'ارز' },
  { id: 'stock', label: 'سهام و صندوق' },
  { id: 'crypto', label: 'رمزارز' },
  { id: 'other', label: 'سایر' }
]

const CLASS_IDS = new Set<string>(VAULT_ASSET_CLASSES.map(item => item.id))

/** Quantity fraction digits a new asset of each class starts with. */
export const DEFAULT_CLASS_DECIMALS: Record<VaultAssetClass, number> = {
  gold: 0,
  currency: 2,
  stock: 0,
  crypto: 8,
  other: 2
}

export const MAX_QUANTITY_DECIMALS = 8

/** A manual price older than this many days asks to be refreshed. */
export const MANUAL_PRICE_STALE_DAYS = 30

export function getAssetClassLabel(assetClass: VaultAssetClass): string {
  return VAULT_ASSET_CLASSES.find(item => item.id === assetClass)?.label ?? 'سایر'
}

export function parseAssetClass(raw: string | undefined): VaultAssetClass {
  const value = String(raw ?? '').trim()

  if (CLASS_IDS.has(value)) return value as VaultAssetClass

  return VAULT_ASSET_CLASSES.find(item => item.label === value)?.id ?? 'other'
}

/** Whole number in 0…8; anything else falls back. */
export function normalizeDecimals(raw: unknown, fallback = 2): number {
  const value = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim())

  if (!Number.isInteger(value) || String(raw ?? '').trim() === '') return fallback

  return Math.min(MAX_QUANTITY_DECIMALS, Math.max(0, value))
}

function builtin(
  id: string,
  assetClass: VaultAssetClass,
  name: string,
  symbol: string,
  unit: string,
  decimals: number,
  tgjuKey: string
): VaultAsset {
  return {
    id,
    assetClass,
    symbol,
    name,
    unit,
    decimals,
    priceSource: 'tgju',
    tgjuKey,
    manualPrice: 0,
    manualPriceAt: '',
    active: true
  }
}

const LEGACY_ASSETS: VaultAsset[] = [
  builtin('sekeb', 'gold', 'سکه بهار آزادی', 'بهار', 'عدد', 0, 'sekeb'),
  builtin('sekee', 'gold', 'سکه امامی', 'امامی', 'عدد', 0, 'sekee'),
  builtin('nim', 'gold', 'نیم سکه', 'نیم', 'عدد', 0, 'nim'),
  builtin('rob', 'gold', 'ربع سکه', 'ربع', 'عدد', 0, 'rob'),
  builtin('gerami', 'gold', 'سکه گرمی', 'گرمی', 'عدد', 0, 'gerami'),
  builtin('geram18', 'gold', 'طلای ۱۸ عیار', '۱۸ عیار', 'گرم', 2, 'geram18'),
  builtin('usd', 'currency', 'دلار', 'USD', 'دلار', 2, 'price_dollar_rl')
]

const LEGACY_IDS = new Set<string>(LEGACY_ASSETS.map(asset => asset.id))

/** The seven legacy assets plus every tgju-priced currency of the converter. */
export const BUILTIN_VAULT_ASSETS: VaultAsset[] = [
  ...LEGACY_ASSETS,
  ...EXCHANGE_CURRENCY_OPTIONS.filter(
    option => option.tgjuKey && !LEGACY_ASSETS.some(asset => asset.tgjuKey === option.tgjuKey)
  ).map(option =>
    builtin(
      option.code,
      'currency',
      option.label,
      option.code.toUpperCase(),
      option.label.split(' ')[0],
      2,
      option.tgjuKey!
    )
  )
]

const BUILTIN_BY_ID = new Map(BUILTIN_VAULT_ASSETS.map(asset => [asset.id, asset]))

/** Built-in hints shown under the add form's asset select. */
export const VAULT_ASSET_HINTS: Partial<Record<LegacyVaultAssetId, string>> = {
  gerami: 'هر سکه حدود ۱ گرم طلا',
  geram18: 'مقدار را به گرم وارد کنید'
}

export function isBuiltinAsset(id: string): boolean {
  return BUILTIN_BY_ID.has(id)
}

/**
 * Transaction rows keep their «نوع دارایی» value: legacy ids (any case, or the old
 * Persian label) map to the seeded rows; any other value is a catalog id as-is.
 */
export function normalizeAssetId(raw: string | undefined): string {
  const value = String(raw ?? '').trim()
  const lower = value.toLowerCase()

  if (LEGACY_IDS.has(lower)) return lower

  return LEGACY_ASSETS.find(asset => asset.name === value)?.id ?? value
}

function isTruthyCell(raw: string | undefined): boolean {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()

  return !['خیر', 'false', '0', 'no', 'غیرفعال'].includes(value)
}

export function rowToVaultAsset(row: string[]): VaultAsset | null {
  const id = normalizeAssetId(row[0])

  if (!id) return null

  const base = BUILTIN_BY_ID.get(id)
  const assetClass = String(row[1] ?? '').trim() ? parseAssetClass(row[1]) : base?.assetClass
  const resolvedClass = assetClass ?? 'other'
  const tgjuKey = String(row[7] ?? '').trim() || base?.tgjuKey || ''
  const source = String(row[6] ?? '').trim()

  return {
    id,
    assetClass: resolvedClass,
    symbol: String(row[2] ?? '').trim() || base?.symbol || '',
    name: String(row[3] ?? '').trim() || base?.name || id,
    unit: String(row[4] ?? '').trim() || base?.unit || '',
    decimals: normalizeDecimals(row[5], base?.decimals ?? DEFAULT_CLASS_DECIMALS[resolvedClass]),
    priceSource: source === 'manual' || !tgjuKey ? 'manual' : 'tgju',
    tgjuKey,
    manualPrice: parseNumeric(row[8]),
    manualPriceAt: String(row[9] ?? '').trim(),
    active: isTruthyCell(row[10])
  }
}

export function vaultAssetToRow(asset: VaultAsset): string[] {
  return [
    asset.id,
    asset.assetClass,
    asset.symbol,
    asset.name,
    asset.unit,
    String(asset.decimals),
    asset.priceSource,
    asset.tgjuKey,
    asset.manualPrice ? String(asset.manualPrice) : '',
    asset.manualPriceAt,
    asset.active ? 'بله' : 'خیر'
  ]
}

/** Built-ins (sheet rows override them) followed by the user's own assets; first id wins. */
export function mergeVaultCatalog(sheetAssets: VaultAsset[]): VaultAsset[] {
  const byId = new Map<string, VaultAsset>()

  for (const asset of sheetAssets) {
    if (!byId.has(asset.id)) byId.set(asset.id, asset)
  }

  const builtins = BUILTIN_VAULT_ASSETS.map(asset => byId.get(asset.id) ?? asset)
  const custom = [...byId.values()].filter(asset => !BUILTIN_BY_ID.has(asset.id))

  return [...builtins, ...custom]
}

/** Built-in rows the sheet does not have yet (seeded on first run). */
export function missingBuiltinAssets(sheetAssets: VaultAsset[]): VaultAsset[] {
  const present = new Set(sheetAssets.map(asset => asset.id))

  return BUILTIN_VAULT_ASSETS.filter(asset => !present.has(asset.id))
}

let cachedCatalog: VaultAsset[] | null = null

/** The last catalog loaded from the sheet, or the built-ins before it loads. */
export function getVaultCatalog(): VaultAsset[] {
  return cachedCatalog ?? BUILTIN_VAULT_ASSETS
}

export function setVaultCatalog(catalog: VaultAsset[] | null): void {
  cachedCatalog = catalog
}

/** Unknown ids still show (as «سایر» with a manual price of 0) rather than vanish. */
export function resolveVaultAsset(id: string, catalog = getVaultCatalog()): VaultAsset {
  const normalized = normalizeAssetId(id)

  return (
    catalog.find(asset => asset.id === normalized) ?? {
      ...builtin(normalized, 'other', normalized, '', '', 2, ''),
      priceSource: 'manual'
    }
  )
}

export function getAssetLabel(id: string): string {
  return resolveVaultAsset(id).name
}

export function getAssetUnit(id: string): string {
  return resolveVaultAsset(id).unit
}

/** asset id → tgju key, for every tgju-priced catalog row. */
export function vaultTgjuKeys(catalog = getVaultCatalog()): Record<string, string> {
  const keys: Record<string, string> = {}

  for (const asset of catalog) {
    if (asset.priceSource === 'tgju' && asset.tgjuKey) keys[asset.id] = asset.tgjuKey
  }

  return keys
}

export interface NewVaultAssetInput {
  assetClass: VaultAssetClass
  name: string
  symbol: string
  unit: string
  decimals: number
  price: number
}

/** A user-added asset: always manually priced, the price dated today. */
export function newManualAsset(input: NewVaultAssetInput, todayIso = getTodayIso()): VaultAsset {
  return {
    ...builtin(
      crypto.randomUUID(),
      input.assetClass,
      input.name.trim(),
      input.symbol.trim(),
      input.unit.trim(),
      normalizeDecimals(input.decimals, DEFAULT_CLASS_DECIMALS[input.assetClass]),
      ''
    ),
    priceSource: 'manual',
    manualPrice: input.price > 0 ? input.price : 0,
    manualPriceAt: input.price > 0 ? todayIso : ''
  }
}

/** A manual price never set, or set more than 30 days ago. */
export function isManualPriceStale(asset: VaultAsset, todayIso = getTodayIso()): boolean {
  if (asset.priceSource !== 'manual') return false
  if (!asset.manualPrice || !asset.manualPriceAt) return true

  return diffIsoDays(asset.manualPriceAt, todayIso) > MANUAL_PRICE_STALE_DAYS
}
