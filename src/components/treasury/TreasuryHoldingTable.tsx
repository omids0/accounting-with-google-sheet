import { type ReactNode, useMemo } from 'react'

import { formatQuantity } from './utils'
import { getAssetLabel } from '../../services/tgju'
import type { VaultHolding } from '../../types'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { moneyColumn, textColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'

/** Desktop view of the holdings; buy/sell history and the sell form open in the detail line. */
export default function TreasuryHoldingTable({
  holdings,
  expandedAsset,
  onToggle,
  renderDetail
}: {
  holdings: VaultHolding[]
  expandedAsset: string | null
  onToggle: (holding: VaultHolding) => void
  renderDetail: (holding: VaultHolding) => ReactNode
}) {
  const columns = useMemo<DataTableColumn<VaultHolding>[]>(
    () => [
      textColumn('asset', 'دارایی', holding => getAssetLabel(holding.assetType), true),
      {
        id: 'quantity',
        header: 'مقدار',
        numeric: true,
        sortValue: holding => holding.netQuantity,
        cell: holding => formatQuantity(holding.netQuantity, holding.assetType)
      },
      moneyColumn('price', 'قیمت روز', holding => holding.currentUnitPrice),
      moneyColumn('value', 'ارزش کل', holding => holding.totalValue)
    ],
    []
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
