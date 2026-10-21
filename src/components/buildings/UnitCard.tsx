import UnitBalance from './UnitBalance'
import { unitPlace, unitStatus, unitWho, type UnitRowData } from './unitRows'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import {
  calmDayBadgeClass,
  calmDayBadgeDangerClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

/** The meta line wraps (it is long), unlike the one-line subtitle of the dashboard rows. */
const unitSubClass = 'mt-0.5 block text-sm leading-relaxed text-muted'

interface UnitCardProps {
  row: UnitRowData
  onOpen: (row: UnitRowData) => void
  /** The «⋯» button; absent for a role that cannot edit. */
  onMore?: (row: UnitRowData) => void
}

/**
 * One unit in the list: the number badge (red while it owes), who lives there and who owns it,
 * the numbers and the charge, and what it owes (or holds in credit), or a tick.
 */
export default function UnitCard({ row, onOpen, onMore }: UnitCardProps) {
  const { unit, balance, charge } = row

  const owes = balance.open > 0

  const status = unitStatus(balance)

  return (
    <li className={cn(calmRowClass, 'gap-1')} data-highlight-id={unit.id}>
      <button
        type="button"
        className={cn(
          calmRowClass,
          'min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-start'
        )}
        onClick={() => onOpen(row)}
        aria-label={`واحد ${toPersianDigits(unit.number)}`}
      >
        <span className={cn(calmDayBadgeClass, owes && calmDayBadgeDangerClass)}>
          {toPersianDigits(unit.number)}
        </span>
        <span className={calmRowMainClass}>
          <span className={calmRowTitleClass}>{unitWho(row)}</span>
          <span className={unitSubClass}>
            {unitPlace(unit)} · شارژ <MoneyText amount={charge} />
            {status.text && !status.credit ? ` · ${status.text}` : ''}
          </span>
        </span>
        <span className={cn(calmRowEndClass, 'text-sm')}>
          <UnitBalance owed={balance.open} credit={balance.credit} />
        </span>
      </button>
      {onMore ? <UnitMoreButton row={row} onMore={onMore} /> : null}
    </li>
  )
}

/** The «⋯» button of a unit row (phone card and desktop table). */
export function UnitMoreButton({
  row,
  onMore
}: {
  row: UnitRowData
  onMore: (row: UnitRowData) => void
}) {
  return (
    <button
      type="button"
      className="h-11 w-11 shrink-0 cursor-pointer rounded-md border-0 bg-transparent text-muted"
      onClick={() => onMore(row)}
      aria-label={`گزینه‌های واحد ${toPersianDigits(row.unit.number)}`}
    >
      ⋯
    </button>
  )
}
