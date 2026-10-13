import { useEffect } from 'react'

import { useHighlightParam } from '../../hooks/useHighlightParam'
import type { TreasuryClassFilter } from '../../services/treasuryClassPref'
import type { SavingsGoal, VaultHolding } from '../../types'

/**
 * A holding or goal opened from the search (`?highlight=`): switch the class chip
 * so it is listed (an archived goal only shows under «هدف‌ها»), then expand and flash it.
 */
export function useTreasuryHighlight({
  holdings,
  goals,
  selected,
  select,
  expandHolding
}: {
  holdings: VaultHolding[]
  goals: SavingsGoal[]
  selected: TreasuryClassFilter
  select: (next: TreasuryClassFilter) => void
  expandHolding: (assetType: string) => void
}) {
  const id = useHighlightParam(found => {
    if (holdings.some(holding => holding.assetType === found)) expandHolding(found)
  })

  useEffect(() => {
    if (!id) return

    const holding = holdings.find(item => item.assetType === id)
    const goal = holding ? undefined : goals.find(item => item.id === id)
    let wanted = selected

    if (holding && selected !== 'all' && selected !== holding.asset.assetClass) wanted = 'all'
    if (goal?.status === 'archived') wanted = 'goals'
    else if (goal && selected !== 'all' && selected !== 'goals') wanted = 'all'

    if (wanted !== selected) select(wanted)
  }, [id, holdings, goals, selected, select])
}
