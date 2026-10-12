import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import type { MoneyDisplaySize } from '../MoneyDisplay'
import {
  moneyDisplayClass,
  moneyDisplayUnitClassName,
  moneyDisplayValueClassName
} from '../ui/displayStyles'
import { cardActionBtnClass } from '../ui/featureCardStyles'

/**
 * One line of text: the real text class sets font size, line height and margins,
 * so the placeholder takes exactly the box the loaded text will.
 */
export function SkeletonText({ className, width }: { className?: string; width: string }) {
  return (
    <span className={cn(className, 'flex h-lh items-center')} aria-hidden="true">
      <Skeleton width={width} height="0.7lh" />
    </span>
  )
}

/** How many action buttons and meta lines the real card of a list shows. */
export interface DangCardSkeletonShape {
  actions?: number
  metaLines?: number
}

/** Placeholder in the exact box of a real card action button (edit, delete…). */
export function SkeletonActionButton() {
  return (
    <span className={cn(cardActionBtnClass, 'card-action-btn')} aria-hidden="true">
      <Skeleton variant="rect" width="1.1rem" height="1.1rem" />
    </span>
  )
}

/** A MoneyDisplay-sized placeholder: same size classes, so value and unit lines match. */
export function MoneySkeleton({ size, width }: { size: MoneyDisplaySize; width: string }) {
  return (
    <span className={moneyDisplayClass({ size })} aria-hidden="true">
      <SkeletonText className={moneyDisplayValueClassName} width={width} />
      {size === 'stat' || size === 'hero' ? (
        <SkeletonText className={moneyDisplayUnitClassName} width="2rem" />
      ) : null}
    </span>
  )
}
