import type { IssueRow } from '../../services/buildingChargePlan'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import {
  dataTableCellClass,
  dataTableClass,
  dataTableHeadCellClass,
  dataTableNumericClass,
  dataTableRowClass,
  dataTableWrapClass
} from '../ui/tableStyles'

/** «مالک» next to a debtor who is the owner of a unit nobody lives in. */
function debtorText(row: IssueRow): string {
  if (!row.debtor) return '—'

  return row.debtor.role === 'owner' && row.unit.occupancy === 'vacant'
    ? `${row.debtor.name} (مالک)`
    : row.debtor.name
}

function amountCell(row: IssueRow) {
  if (row.skip === 'no-debtor') return '—'
  if (row.skip === 'exempt') return 'معاف'

  return (
    <>
      <MoneyText amount={row.amount} />
      {row.fromCredit > 0 ? (
        <small className="block text-sm text-success">
          از اعتبار <MoneyText amount={row.fromCredit} />
        </small>
      ) : null}
    </>
  )
}

/**
 * The issue preview (screen 19): unit, debtor, basis, amount. Units the month already has are
 * greyed with «قبلاً صادر شده»; units without a tenant or owner or with a zero charge are greyed
 * and skipped.
 */
export default function IssuePreviewTable({ rows }: { rows: IssueRow[] }) {
  return (
    <div className={cn(dataTableWrapClass(true), 'shrink-0')}>
      <table className={dataTableClass}>
        <thead>
          <tr>
            <th className={dataTableHeadCellClass}>واحد</th>
            <th className={dataTableHeadCellClass}>بدهکار</th>
            <th className={dataTableHeadCellClass}>محاسبه</th>
            <th className={dataTableHeadCellClass}>مبلغ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.unit.id} className={dataTableRowClass(row.skip !== null)}>
              <td className={dataTableCellClass}>{toPersianDigits(row.unit.number)}</td>
              <td className={dataTableCellClass}>{debtorText(row)}</td>
              <td className={dataTableCellClass}>{row.already ? 'قبلاً صادر شده' : row.basis}</td>
              <td className={`${dataTableCellClass} ${dataTableNumericClass}`}>
                {amountCell(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
