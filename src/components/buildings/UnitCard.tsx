import UnitBalance from './UnitBalance'
import { unitPlace, unitStatus, unitWho, type UnitRowData } from './unitRows'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import {
  buildingRowTitleClass,
  buildingRowEndClass,
  buildingRowSubClass,
  buildingDayBadgeClass,
  buildingMoreButtonClass
} from '../ui/buildingStyles'
import { calmDayBadgeDangerClass, calmRowClass, calmRowMainClass } from '../ui/calmListStyles'

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
        <span className={cn(buildingDayBadgeClass, owes && calmDayBadgeDangerClass)}>
          {toPersianDigits(unit.number)}
        </span>
        <span className={calmRowMainClass}>
          <span className={buildingRowTitleClass}>{unitWho(row)}</span>
          <span className={buildingRowSubClass}>
            {unitPlace(unit)} · شارژ <MoneyText amount={charge} />
            {status.text && !status.credit ? ` · ${status.text}` : ''}
          </span>
        </span>
        <span className={buildingRowEndClass}>
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
      className={buildingMoreButtonClass}
      onClick={() => onMore(row)}
      aria-label={`گزینه‌های واحد ${toPersianDigits(row.unit.number)}`}
    >
      ⋯
    </button>
  )
}
