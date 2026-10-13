import { useCallback, useMemo, useState } from 'react'

import { getSettings } from '../../services/settings'
import { getAssetClassLabel } from '../../services/treasuryCatalog'
import {
  getTreasuryClassFilter,
  setTreasuryClassFilter,
  type TreasuryClassFilter
} from '../../services/treasuryClassPref'
import { countHoldingsByClass, totalsByClass } from '../../services/treasuryHoldings'
import type { VaultAssetClass, VaultHolding } from '../../types'
import { haptic } from '../../utils/haptics'

/**
 * The «صندوقچه» class chips: counts come from all holdings, the selection (kept per
 * spreadsheet) narrows the searched list, the price card and the stat total.
 */
export function useTreasuryClassFilter(holdings: VaultHolding[], searchedHoldings: VaultHolding[]) {
  const spreadsheetId = getSettings()?.spreadsheetId

  const [stored, setStored] = useState(() => getTreasuryClassFilter(spreadsheetId))

  const counts = useMemo(() => countHoldingsByClass(holdings), [holdings])

  // A class whose last holding was sold has no chip; fall back to «همه» without forgetting it.
  const selected: TreasuryClassFilter =
    stored === 'all' || stored === 'goals' || counts[stored] > 0 ? stored : 'all'

  const assetClass: VaultAssetClass | null =
    selected === 'all' || selected === 'goals' ? null : selected

  const select = useCallback(
    (next: TreasuryClassFilter) => {
      haptic('selection')
      setStored(next)
      setTreasuryClassFilter(spreadsheetId, next)
    },
    [spreadsheetId]
  )

  const inClass = useCallback(
    (list: VaultHolding[]) =>
      assetClass ? list.filter(holding => holding.asset.assetClass === assetClass) : list,
    [assetClass]
  )

  const classHoldings = useMemo(() => inClass(holdings), [inClass, holdings])

  const visibleHoldings = useMemo(() => inClass(searchedHoldings), [inClass, searchedHoldings])

  const groups = useMemo(() => totalsByClass(visibleHoldings), [visibleHoldings])

  return {
    selected,
    assetClass,
    select,
    counts,
    /** Every holding of the class (search aside): the stat total. */
    classHoldings,
    classTotal: classHoldings.reduce((sum, holding) => sum + holding.totalValue, 0),
    totalLabel: assetClass
      ? `جمع ${getAssetClassLabel(assetClass)}`
      : 'ارزش کل صندوقچه (بر اساس قیمت روز)',
    visibleHoldings,
    /** Card sections in «همه»: one per class, with its subtotal. */
    groups
  }
}
