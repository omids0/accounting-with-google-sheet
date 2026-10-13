import { netWorthMonthTitle } from './netWorthLabels'
import type { NetWorthMove } from '../../services/netWorthTrend'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import MoneyText from '../MoneyText'
import {
  calmDayBadgeClass,
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

/** «بیشترین رشد» or «بیشترین افت»: up to three months, each with a one-line reason. */
export default function NetWorthTopMonths({
  title,
  moves
}: {
  title: string
  moves: NetWorthMove[]
}) {
  if (!moves.length) return null

  return (
    <CalmBlock title={title}>
      <ol className={calmListClass}>
        {moves.map((move, index) => (
          <li key={move.monthKey} className={calmRowClass}>
            <span className={calmDayBadgeClass} aria-hidden="true">
              {formatPersianNumber(index + 1)}
            </span>
            <span className={calmRowMainClass}>
              <span className={calmRowTitleClass}>{netWorthMonthTitle(move.monthKey)}</span>
              {move.reason ? <span className={calmRowSubClass}>{move.reason}</span> : null}
            </span>
            <span className={cn(calmRowEndClass, move.change > 0 ? 'text-success' : 'text-danger')}>
              <MoneyText amount={move.change} signed="plus" />
            </span>
          </li>
        ))}
      </ol>
    </CalmBlock>
  )
}
