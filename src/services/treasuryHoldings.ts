import { getVaultCatalog, resolveVaultAsset, VAULT_ASSET_CLASSES } from './treasuryCatalog'
import { costBasis, unrealized } from './treasuryPnl'
import type { VaultAsset, VaultAssetClass, VaultHolding, VaultTransaction } from '../types'

export function netQuantity(transactions: VaultTransaction[], assetType: string): number {
  return transactions
    .filter(tx => tx.assetType === assetType)
    .reduce((sum, tx) => sum + (tx.action === 'buy' ? tx.quantity : -tx.quantity), 0)
}

function safePrice(raw: number | undefined): number {
  // Never let a NaN quote poison the holding value or the dashboard total.
  return raw != null && Number.isFinite(raw) && raw > 0 ? raw : 0
}

/** Manual-priced assets use the catalog price; the rest use `prices` (tgju). */
export function assetUnitPrice(asset: VaultAsset, prices: Record<string, number>): number {
  return safePrice(asset.priceSource === 'manual' ? asset.manualPrice : prices[asset.id])
}

const CLASS_ORDER = new Map(VAULT_ASSET_CLASSES.map((item, index) => [item.id, index]))

/** Holdings with a positive net quantity, by class then catalog order. */
export function computeHoldings(
  transactions: VaultTransaction[],
  prices: Record<string, number>,
  catalog: VaultAsset[] = getVaultCatalog()
): VaultHolding[] {
  const byAsset = new Map<string, VaultTransaction[]>()

  for (const tx of transactions) {
    const list = byAsset.get(tx.assetType) ?? []

    list.push(tx)
    byAsset.set(tx.assetType, list)
  }

  const holdings: VaultHolding[] = []

  for (const [assetType, txs] of byAsset) {
    const qty = netQuantity(txs, assetType)

    if (qty <= 0) continue

    const sorted = [...txs].sort((a, b) =>
      (b.transactionDate || '').localeCompare(a.transactionDate || '')
    )

    const asset = resolveVaultAsset(assetType, catalog)
    const unitPrice = assetUnitPrice(asset, prices)
    const basis = costBasis(txs)
    const open = unitPrice > 0 ? unrealized({ ...basis, quantity: qty }, unitPrice) : null

    holdings.push({
      assetType,
      asset,
      netQuantity: qty,
      currentUnitPrice: unitPrice,
      totalValue: qty * unitPrice,
      avgUnitCost: basis.avgUnitCost,
      unrealized: open?.amount ?? 0,
      unrealizedPct: open?.pct ?? 0,
      realized: basis.realized,
      sellCount: basis.sells,
      transactions: sorted
    })
  }

  const catalogIndex = new Map(catalog.map((asset, index) => [asset.id, index]))
  const rank = (holding: VaultHolding) =>
    (CLASS_ORDER.get(holding.asset.assetClass) ?? 99) * 10_000 +
    (catalogIndex.get(holding.assetType) ?? 9_999)

  return holdings.sort((a, b) => rank(a) - rank(b))
}

/**
 * Holdings that need a live (tgju) quote but have none, so they are valued 0. Manual-priced assets
 * are never listed: their price is the user's own.
 */
export function unquotedHoldings(holdings: VaultHolding[]): VaultHolding[] {
  return holdings.filter(
    holding => holding.asset.priceSource !== 'manual' && holding.currentUnitPrice <= 0
  )
}

/** True when any asset in `transactions` is priced by a live quote (a manual one needs no network). */
export function needsLiveQuotes(
  transactions: VaultTransaction[],
  catalog: VaultAsset[] = getVaultCatalog()
): boolean {
  return transactions.some(tx => resolveVaultAsset(tx.assetType, catalog).priceSource !== 'manual')
}

export type VaultClassCounts = Record<VaultAssetClass, number> & { all: number }

/** Holdings per class (every holding already has a net quantity > 0). */
export function countHoldingsByClass(holdings: VaultHolding[]): VaultClassCounts {
  const counts = { all: holdings.length } as VaultClassCounts

  for (const { id } of VAULT_ASSET_CLASSES) counts[id] = 0
  for (const holding of holdings) counts[holding.asset.assetClass] += 1

  return counts
}

export interface VaultClassTotal {
  assetClass: VaultAssetClass
  label: string
  total: number
  /** What the held units cost (Σ average cost × quantity). */
  cost: number
  unrealized: number
  realized: number
  holdings: VaultHolding[]
}

/** One entry per class that has holdings, in chip order. */
export function totalsByClass(holdings: VaultHolding[]): VaultClassTotal[] {
  return VAULT_ASSET_CLASSES.map(({ id, label }) => {
    const inClass = holdings.filter(holding => holding.asset.assetClass === id)

    return {
      assetClass: id,
      label,
      total: inClass.reduce((sum, holding) => sum + holding.totalValue, 0),
      cost: inClass.reduce((sum, holding) => sum + holding.avgUnitCost * holding.netQuantity, 0),
      unrealized: inClass.reduce((sum, holding) => sum + holding.unrealized, 0),
      realized: inClass.reduce((sum, holding) => sum + holding.realized, 0),
      holdings: inClass
    }
  }).filter(group => group.holdings.length > 0)
}
