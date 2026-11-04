import { undatedCount, type ChildEntry } from './childViewModel'
import { formatPersianNumber } from '../../utils/formatMoney'
import { sharedMutedClass } from '../ui/sharedStyles'

/**
 * A muted line when some of the child's records have no valid date: they are in no month, so the
 * month figures leave them out and a parent would otherwise wonder where they went.
 */
export default function ChildUndatedNote({ entries }: { entries: readonly ChildEntry[] }) {
  const count = undatedCount(entries)

  if (!count) return null

  return (
    <p className={sharedMutedClass}>{`${formatPersianNumber(count)} تراکنش بدون تاریخ معتبر`}</p>
  )
}
