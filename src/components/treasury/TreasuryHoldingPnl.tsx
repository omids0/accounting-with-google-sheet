import { formatPct } from '../../services/treasuryPnl'
import type { VaultHolding } from '../../types'
import { formatDayBadge } from '../../utils/periodLabel'
import MoneyText from '../MoneyText'
import { treasuryPnlClass, treasuryPnlMutedClass } from '../ui/treasuryReceivableStyles'

/** A signed amount in the success / danger color (the vault's profit or loss). */
export function PnlAmount({ amount }: { amount: number }) {
  return (
    <span className={amount < 0 ? 'text-danger' : amount > 0 ? 'text-success' : undefined}>
      <MoneyText amount={amount} signed="plus" />
    </span>
  )
}

/** Open profit/loss of a holding, today's price, and what past sells already locked in. */
export default function TreasuryHoldingPnl({ holding }: { holding: VaultHolding }) {
  const { asset } = holding
  const unpriced = !holding.transactions.some(tx => tx.unitPrice > 0)

  if (unpriced) return <div className={treasuryPnlMutedClass}>بدون قیمت خرید</div>

  const badge = asset.manualPriceAt ? formatDayBadge(asset.manualPriceAt) : null
  const priceNote =
    asset.priceSource === 'manual'
      ? `قیمت دستی${badge ? ` · ${badge.day} ${badge.month}` : ''}`
      : null

  return (
    <>
      {holding.currentUnitPrice > 0 ? (
        <div className={treasuryPnlClass}>
          <PnlAmount amount={holding.unrealized} />
          <span className={treasuryPnlMutedClass}>
            {` · ${formatPct(holding.unrealizedPct)} · `}
            {priceNote ?? (
              <>
                قیمت روز <MoneyText amount={holding.currentUnitPrice} />
              </>
            )}
          </span>
        </div>
      ) : null}
      {holding.sellCount > 0 ? (
        <div className={treasuryPnlMutedClass}>
          فروش‌های قبلی: <PnlAmount amount={holding.realized} /> سود/زیان قطعی (
          {holding.sellCount.toLocaleString('fa-IR')} فروش)
        </div>
      ) : null}
    </>
  )
}
