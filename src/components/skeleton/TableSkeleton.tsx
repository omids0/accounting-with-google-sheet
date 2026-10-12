import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import {
  dataTableCellClass,
  dataTableClass,
  dataTableHeadCellClass,
  dataTableRowClass,
  dataTableWrapClass
} from '../ui/tableStyles'

/** Placeholder for a list page's desktop table (shown only at ≥ 1280px, like the table). */
export function TableSkeleton({ rows = 4, columns = 5 }: { rows?: number; columns?: number }) {
  const cells = Array.from({ length: columns }, (_, index) => index)

  return (
    <div className={cn(dataTableWrapClass(), 'hidden xl:block')} aria-hidden="true">
      <table className={dataTableClass}>
        <thead>
          <tr>
            {cells.map(cell => (
              <th key={cell} className={dataTableHeadCellClass}>
                <Skeleton width="3.5rem" height="0.7rem" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row} className={dataTableRowClass()}>
              {cells.map(cell => (
                <td key={cell} className={dataTableCellClass}>
                  <Skeleton width={cell === 0 ? '70%' : '55%'} height="0.8rem" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
