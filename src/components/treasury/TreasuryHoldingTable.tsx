import { type ReactNode, useMemo } from 'react'

import { PnlAmount } from './TreasuryHoldingPnl'
import { formatQuantity } from './utils'
import { getAssetClassLabel, VAULT_ASSET_CLASSES } from '../../services/treasuryCatalog'
import type { TreasuryClassFilter } from '../../services/treasuryClassPref'
import type { VaultClassCounts } from '../../services/treasuryHoldings'
import { formatPct } from '../../services/treasuryPnl'
import type { VaultHolding } from '../../types'
import { Select } from '../form'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { moneyColumn, textColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
import { treasuryTableFilterClass } from '../ui/treasuryReceivableStyles'

/** Desktop view of the holdings; buy/sell history and the sell form open in the detail line. */
export default function TreasuryHoldingTable({
  holdings,
  expandedAsset,
  onToggle,
  renderDetail,
  counts,
  classFilter,
  onClassFilterChange
}: {
  holdings: VaultHolding[]
  expandedAsset: string | null
  onToggle: (holding: VaultHolding) => void
  renderDetail: (holding: VaultHolding) => ReactNode
  counts: VaultClassCounts
  classFilter: TreasuryClassFilter
  onClassFilterChange: (value: TreasuryClassFilter) => void
}) {
  const columns = useMemo<DataTableColumn<VaultHolding>[]>(
    () => [
      {
        ...textColumn<VaultHolding>('class', 'کلاس', holding =>
          getAssetClassLabel(holding.asset.assetClass)
        ),
        // Same filter as the chips above the table.
        headerFilter: (
          <span className={treasuryTableFilterClass}>
            <Select
              compact
              aria-label="فیلتر کلاس"
              value={classFilter === 'goals' ? 'all' : classFilter}
              onChange={next => onClassFilterChange(next as TreasuryClassFilter)}
              options={[
                { value: 'all', label: 'همه' },
                ...VAULT_ASSET_CLASSES.filter(({ id }) => counts[id] > 0).map(({ id, label }) => ({
                  value: id,
                  label
                }))
              ]}
            />
          </span>
        )
      },
      textColumn('asset', 'دارایی', holding => holding.asset.name, true),
      textColumn('symbol', 'نماد', holding => holding.asset.symbol),
      {
        id: 'quantity',
        header: 'مقدار',
        numeric: true,
        sortValue: holding => holding.netQuantity,
        cell: holding => formatQuantity(holding.netQuantity, holding.assetType)
      },
      moneyColumn('price', 'قیمت روز', holding => holding.currentUnitPrice),
      moneyColumn('avg', 'خرید میانگین', holding => holding.avgUnitCost),
      moneyColumn('value', 'ارزش کل', holding => holding.totalValue),
      {
        id: 'unrealized',
        header: 'سود/زیان باز',
        numeric: true,
        sortValue: holding => holding.unrealized,
        cell: holding => <PnlAmount amount={holding.unrealized} />
      },
      {
        id: 'unrealizedPct',
        header: '٪',
        numeric: true,
        sortValue: holding => holding.unrealizedPct,
        cell: holding => formatPct(holding.unrealizedPct)
      }
    ],
    [classFilter, counts, onClassFilterChange]
  )

  return (
    <DataTable
      label="دارایی‌های صندوقچه"
      rows={holdings}
      columns={columns}
      rowKey={holding => holding.assetType}
      expandedKey={expandedAsset}
      renderDetail={renderDetail}
      actions={holding => (
        <TableRowActions
          expanded={expandedAsset === holding.assetType}
          onToggleExpand={() => onToggle(holding)}
          expandLabel="سوابق خرید و فروش"
        />
      )}
    />
  )
}
