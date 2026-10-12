import { Skeleton, SkeletonProgressFill } from './Skeleton'
import {
  MoneySkeleton,
  SkeletonActionButton,
  SkeletonText,
  type DangCardSkeletonShape
} from './SkeletonPrimitives'
import { cn } from '../../utils/cn'
import { cardClassName } from '../ui/Card'
import {
  sparklineClass,
  sparklineWideClass,
  statCardClass,
  statCardValueRowClass,
  statCardValueRowWideClass,
  statLabelClass
} from '../ui/chartStyles'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardAmountClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardTitleClass,
  dangCheckboxClass,
  installmentCardClass,
  installmentChevronClass,
  installmentHeaderClass
} from '../ui/featureCardStyles'
import { activeFilterBarClass, activeFilterTriggerClass } from '../ui/filterControlStyles'
import { progressBarMetaClass } from '../ui/progressStyles'
import {
  recordsDateGridClass,
  recordsFilterSectionClassName,
  recordsToolbarHeaderClass,
  recordsToolbarHeadingClass
} from '../ui/recordsStyles'
import {
  skeletonCardClass,
  skeletonFilterChipClass,
  skeletonRecordActionsClass,
  skeletonRecordItemClass
} from '../ui/skeletonStyles'
import { treasuryHoldingCardClass, treasuryHoldingValueClass } from '../ui/treasuryReceivableStyles'
import {
  walletAccountCardShellClass,
  walletAccountCardVisualHostClass,
  walletCardActionOverlayClass
} from '../wallet/walletCardStyles'

export function FilterChipsSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className={activeFilterBarClass} aria-hidden="true">
      <span className={activeFilterTriggerClass(false)}>
        <Skeleton width="4.5rem" height="0.85rem" style={{ borderRadius: '999px' }} />
      </span>
      {count > 0 &&
        Array.from({ length: count }, (_, index) => (
          <span key={index} className={skeletonFilterChipClass}>
            <Skeleton
              width={index === 0 ? '6.5rem' : '4.5rem'}
              height="0.85rem"
              style={{ borderRadius: '999px' }}
            />
          </span>
        ))}
    </div>
  )
}

export function ReportToolbarSkeleton() {
  return (
    <div
      className={cardClassName(cn('records-toolbar dashboard-toolbar', skeletonCardClass))}
      aria-hidden="true"
    >
      <div className={recordsToolbarHeaderClass}>
        <div className={recordsToolbarHeadingClass}>
          <Skeleton width="38%" height="1rem" />
          <Skeleton width="52%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
        </div>
        <Skeleton
          variant="rect"
          width="2.75rem"
          height="2.75rem"
          style={{ borderRadius: 'var(--radius-sm)' }}
        />
      </div>
      <div className={recordsFilterSectionClassName()} style={{ marginTop: '0.85rem' }}>
        <Skeleton width="25%" height="0.75rem" />
        <div className={recordsDateGridClass}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              variant="rect"
              height="2rem"
              style={{ borderRadius: 'var(--radius)' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** `className` is the one the page passes to its real StatCard (e.g. a total footer). */
export function StatCardSkeleton({
  wide = false,
  className
}: {
  wide?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'stat-card',
        wide && 'card stat-card-wide',
        statCardClass({ variant: 'default', wide, animated: false }),
        skeletonCardClass,
        className
      )}
      aria-hidden="true"
    >
      <SkeletonText
        className={cn('stat-label', statLabelClass, !wide && 'justify-center')}
        width={wide ? '6rem' : '4rem'}
      />
      <div
        className={cn(
          'stat-card-value-row',
          statCardValueRowClass,
          wide && 'stat-card-value-row--wide',
          wide && statCardValueRowWideClass
        )}
      >
        <MoneySkeleton size={wide ? 'stat-wide' : 'stat'} width="4.5rem" />
        <Skeleton
          variant="rect"
          className={cn(sparklineClass, wide && sparklineWideClass)}
          width={wide ? '4.5rem' : undefined}
          height="28px"
        />
      </div>
    </div>
  )
}

export function InstallmentCardSkeleton() {
  return (
    <div className={installmentCardClass({ className: skeletonCardClass })} aria-hidden="true">
      <div className={cardHeaderWithEditClass}>
        <div className={installmentHeaderClass()}>
          <div>
            <Skeleton width="55%" height="0.95rem" />
            <Skeleton width="42%" height="0.75rem" style={{ marginTop: '0.25rem' }} />
            <div className="progress-bar">
              <div className={progressBarMetaClass}>
                <SkeletonProgressFill width="45%" />
                <Skeleton width="1.85rem" height="0.72rem" />
              </div>
            </div>
          </div>
        </div>
        <div className={cardActionButtonsClass}>
          <SkeletonActionButton />
          <SkeletonActionButton />
          <SkeletonActionButton />
        </div>
      </div>
    </div>
  )
}

export function TreasuryHoldingCardSkeleton() {
  return (
    <div
      className={cn(installmentCardClass({}), treasuryHoldingCardClass, skeletonCardClass)}
      aria-hidden="true"
    >
      <div className={installmentHeaderClass()}>
        <div className="min-w-0 flex-1">
          <SkeletonText className="text-[0.95rem] font-semibold" width="40%" />
          <SkeletonText className="mt-1 text-[0.75rem]" width="72%" />
          <SkeletonText className={treasuryHoldingValueClass} width="45%" />
        </div>
        <span className={installmentChevronClass}>
          <Skeleton width="0.6rem" height="0.6rem" />
        </span>
      </div>
    </div>
  )
}

export function WalletAccountCardSkeleton() {
  return (
    <div className={cn(walletAccountCardShellClass, skeletonCardClass)} aria-hidden="true">
      <div className={walletAccountCardVisualHostClass}>
        <Skeleton
          variant="rect"
          style={{ width: '100%', height: '6.35rem', borderRadius: '12px' }}
        />
        <div
          className={cn(
            walletCardActionOverlayClass,
            'border-transparent bg-transparent shadow-none'
          )}
        >
          <SkeletonActionButton />
          <SkeletonActionButton />
          <SkeletonActionButton />
        </div>
      </div>
    </div>
  )
}

export function DangCardSkeleton({ actions = 2, metaLines = 2 }: DangCardSkeletonShape) {
  return (
    <div className={dangCardClass({ className: skeletonCardClass })} aria-hidden="true">
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <Skeleton variant="rect" className={dangCheckboxClass} />
          <div className={dangCardBodyClass}>
            <div className={dangCardHeaderClass}>
              <SkeletonText className={dangCardTitleClass} width="6rem" />
              <SkeletonText className={dangCardAmountClass} width="5rem" />
            </div>
            {Array.from({ length: metaLines }, (_, index) => (
              <SkeletonText
                key={index}
                className={dangCardMetaClass}
                width={index ? '45%' : '70%'}
              />
            ))}
          </div>
        </div>
        <div className={cardActionButtonsClass}>
          {Array.from({ length: actions }, (_, index) => (
            <SkeletonActionButton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function RecordItemSkeleton() {
  return (
    <div className={cn('record-item', skeletonRecordItemClass)} aria-hidden="true">
      <div className="record-item-main">
        <Skeleton width="50%" height="0.9rem" />
        <Skeleton width="35%" height="0.75rem" style={{ marginTop: '0.4rem' }} />
      </div>
      <div className={skeletonRecordActionsClass}>
        <Skeleton width="4.5rem" height="1rem" />
        <div className={cardActionButtonsClass}>
          <SkeletonActionButton />
          <SkeletonActionButton />
        </div>
      </div>
    </div>
  )
}

export {
  MoneySkeleton,
  SkeletonActionButton,
  SkeletonText,
  type DangCardSkeletonShape
} from './SkeletonPrimitives'
