import { useActiveParentCount } from '../../hooks/useActiveParentCount'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { buildingChipToneClass } from '../ui/buildingStyles'

/**
 * The always-visible transparency note on the menu entry «والدین من»: how many parents can see this
 * account right now. Nothing shows while there are none.
 */
export default function ParentsMenuBadge() {
  const count = useActiveParentCount()

  if (!count) return null

  return (
    <span
      className={`${buildingChipToneClass.neutral} shrink-0`}
      title="والدینی که حساب شما را می‌بینند"
      role="img"
      aria-label={`${toPersianDigits(String(count))} والد حساب شما را می‌بینند`}
    >
      {`${toPersianDigits(String(count))} والد`}
    </span>
  )
}
