import type { VaultTransaction } from '../types'
import { formatPersianNumber, MINUS_SIGN } from '../utils/formatMoney'

/** Weighted-average cost of what is still held, plus what past sells already earned. */
export interface CostBasis {
  avgUnitCost: number
  quantity: number
  realized: number
  sells: number
  buys: number
}

function chronological(transactions: VaultTransaction[]): VaultTransaction[] {
  return [...transactions].sort(
    (a, b) =>
      (a.transactionDate || '').localeCompare(b.transactionDate || '') ||
      (a.createdAt || '').localeCompare(b.createdAt || '')
  )
}

/**
 * Replays the transactions oldest first: a buy moves the average, a sell realizes
 * (price − average) × quantity and leaves the average alone. Selling more than is held
 * counts only what is held; at zero quantity the average stays for display.
 */
function replay(
  transactions: VaultTransaction[],
  onStep?: (tx: VaultTransaction, gain: number | null, avgUnitCost: number) => void
): CostBasis {
  const basis: CostBasis = { avgUnitCost: 0, quantity: 0, realized: 0, sells: 0, buys: 0 }

  for (const tx of chronological(transactions)) {
    if (tx.action === 'buy') {
      const total = basis.quantity + tx.quantity

      if (total > 0) {
        basis.avgUnitCost =
          (basis.avgUnitCost * basis.quantity + tx.unitPrice * tx.quantity) / total
      }
      basis.quantity = total
      basis.buys += 1
      onStep?.(tx, null, basis.avgUnitCost)

      continue
    }

    const sold = Math.min(tx.quantity, basis.quantity)
    const gain = (tx.unitPrice - basis.avgUnitCost) * sold

    basis.realized += gain
    basis.quantity -= sold
    basis.sells += 1
    onStep?.(tx, gain, basis.avgUnitCost)
  }

  return basis
}

export function costBasis(transactions: VaultTransaction[]): CostBasis {
  return replay(transactions)
}

/** Open (unrealized) profit or loss of what is still held, in money and percent of its cost. */
export function unrealized(
  basis: CostBasis,
  currentUnitPrice: number
): { amount: number; pct: number } {
  const amount = (currentUnitPrice - basis.avgUnitCost) * basis.quantity
  const cost = basis.avgUnitCost * basis.quantity

  return { amount, pct: cost > 0 ? (amount / cost) * 100 : 0 }
}

/** Realized profit of the sells dated inside `range` (ISO dates, both ends included). */
export function realizedInRange(
  transactions: VaultTransaction[],
  range: { from: string; to: string }
): number {
  let sum = 0

  replay(transactions, (tx, gain) => {
    const date = (tx.transactionDate || '').slice(0, 10)

    if (gain !== null && date >= range.from && date <= range.to) sum += gain
  })

  return sum
}

/** Per transaction: its asset's average cost right after it, and what a sell earned (null for a buy). */
export function transactionPnl(
  transactions: VaultTransaction[]
): Map<string, { avgUnitCost: number; gain: number | null }> {
  const steps = new Map<string, { avgUnitCost: number; gain: number | null }>()
  const byAsset = new Map<string, VaultTransaction[]>()

  for (const tx of transactions)
    byAsset.set(tx.assetType, [...(byAsset.get(tx.assetType) ?? []), tx])
  for (const list of byAsset.values()) {
    replay(list, (tx, gain, avgUnitCost) => steps.set(tx.id, { avgUnitCost, gain }))
  }

  return steps
}

/** Arabic letter mark: keeps «٪» on the left of the digits inside RTL text. */
const ALM = '؜'

/** One decimal, Persian digits: «۱۵٫۷٪», «−۳٫۲٪». */
export function formatPct(pct: number): string {
  const text = formatPersianNumber(Math.abs(pct), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })

  return `${pct < 0 && Math.round(-pct * 10) > 0 ? MINUS_SIGN : ''}${text}${ALM}٪`
}
