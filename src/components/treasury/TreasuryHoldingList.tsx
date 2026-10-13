import type { ReactNode } from 'react'

import type { VaultClassTotal } from '../../services/treasuryHoldings'
import type { VaultHolding } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import { listCardsContainerClass } from '../ui/featureCardStyles'
import { treasuryGroupHeaderClass, treasuryGroupTotalClass } from '../ui/treasuryReceivableStyles'

/** Holding cards; in «همه» grouped by class under a slim header with the class subtotal. */
export default function TreasuryHoldingList({
  groups,
  grouped,
  renderHolding
}: {
  groups: VaultClassTotal[]
  grouped: boolean
  renderHolding: (holding: VaultHolding) => ReactNode
}) {
  if (!grouped || groups.length < 2) {
    return (
      <div className={listCardsContainerClass}>
        {groups.flatMap(group => group.holdings).map(renderHolding)}
      </div>
    )
  }

  return (
    <>
      {groups.map(group => (
        <section key={group.assetClass} aria-label={group.label} className="mb-4 last:mb-0">
          <h2 className={treasuryGroupHeaderClass}>
            <span>{group.label}</span>
            <span className={treasuryGroupTotalClass}>{formatMoney(group.total)}</span>
          </h2>
          <div className={listCardsContainerClass}>{group.holdings.map(renderHolding)}</div>
        </section>
      ))}
    </>
  )
}
