import { residentMeta, type ResidentRowData } from './residentRows'
import { cn } from '../../utils/cn'
import {
  buildingRowTitleClass,
  buildingRowSubClass,
  buildingDayBadgeClass,
  buildingMoreButtonClass
} from '../ui/buildingStyles'
import { calmRowClass, calmRowMainClass } from '../ui/calmListStyles'

interface ResidentRowProps {
  row: ResidentRowData
  /** The «⋯» button (call, SMS, counterparty, change resident, exit). */
  onMore: (row: ResidentRowData) => void
}

/** One stay: the person's initial, name and «<role> · <phone> · واحد <no> · از <date>». */
export default function ResidentRow({ row, onMore }: ResidentRowProps) {
  return (
    <li className={cn(calmRowClass, !row.current && 'opacity-80')} data-highlight-id={row.stay.id}>
      <span className={buildingDayBadgeClass} aria-hidden="true">
        {row.name.trim()[0] ?? '؟'}
      </span>
      <span className={calmRowMainClass}>
        <span className={buildingRowTitleClass}>{row.name}</span>
        <span className={buildingRowSubClass}>{residentMeta(row)}</span>
      </span>
      <button
        type="button"
        className={buildingMoreButtonClass}
        onClick={() => onMore(row)}
        aria-label={`گزینه‌های ${row.name}`}
      >
        ⋯
      </button>
    </li>
  )
}
