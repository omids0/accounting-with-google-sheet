import { residentMeta, type ResidentRowData } from './residentRows'
import { cn } from '../../utils/cn'
import {
  calmDayBadgeClass,
  calmRowClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

interface ResidentRowProps {
  row: ResidentRowData
  /** The «⋯» button (call, SMS, counterparty, change resident, exit). */
  onMore: (row: ResidentRowData) => void
}

/** One stay: the person's initial, name and «<role> · <phone> · واحد <no> · از <date>». */
export default function ResidentRow({ row, onMore }: ResidentRowProps) {
  return (
    <li className={cn(calmRowClass, !row.current && 'opacity-80')} data-highlight-id={row.stay.id}>
      <span className={calmDayBadgeClass} aria-hidden="true">
        {row.name.trim()[0] ?? '؟'}
      </span>
      <span className={calmRowMainClass}>
        <span className={calmRowTitleClass}>{row.name}</span>
        <span className={calmRowSubClass}>{residentMeta(row)}</span>
      </span>
      <button
        type="button"
        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border-0 bg-transparent text-muted"
        onClick={() => onMore(row)}
        aria-label={`گزینه‌های ${row.name}`}
      >
        ⋯
      </button>
    </li>
  )
}
