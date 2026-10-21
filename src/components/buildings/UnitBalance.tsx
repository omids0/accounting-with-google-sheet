import { cn } from '../../utils/cn'
import MoneyText from '../MoneyText'

/**
 * What a unit owes or holds, in words a non-technical reader knows: «بدهکار …» (red), «اعتبار …»
 * (green) or a tick for a settled unit. A unit that owes and also holds credit shows both lines.
 */
export default function UnitBalance({
  owed,
  credit,
  stacked = false,
  className
}: {
  /** Open debt, a positive amount. */
  owed: number
  credit: number
  /** The word above the amount (narrow list rows) instead of before it. */
  stacked?: boolean
  className?: string
}) {
  const owes = owed > 0

  const lineClass = stacked ? 'flex flex-col items-end leading-snug' : ''

  if (!owes && !(credit > 0)) {
    return (
      <span className={cn('text-success', className)} role="img" aria-label="بدون بدهی">
        ✓
      </span>
    )
  }

  return (
    <span className={cn('flex flex-col items-end', className)}>
      {owes ? (
        <span className={cn('text-danger', lineClass)}>
          <span>بدهکار</span> <MoneyText amount={owed} />
        </span>
      ) : null}
      {credit > 0 ? (
        <span className={cn('text-success', lineClass)}>
          <span>اعتبار</span> <MoneyText amount={credit} />
        </span>
      ) : null}
    </span>
  )
}
