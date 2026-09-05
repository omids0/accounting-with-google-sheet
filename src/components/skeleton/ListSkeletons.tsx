import {
  DangCardSkeleton,
  FilterChipsSkeleton,
  InstallmentCardSkeleton,
  RecordItemSkeleton,
  StatCardSkeleton,
  TreasuryHoldingCardSkeleton,
  WalletAccountCardSkeleton
} from './CardSkeletons'
import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import { cardClassName } from '../ui/Card'
import { dashboardOpeningCardClass, dashboardStatGridClass } from '../ui/chartStyles'
import {
  installmentCardClass,
  installmentHeaderClass,
  walletItemCardClass,
  walletItemInfoClass,
  walletItemTitleRowClass
} from '../ui/featureCardStyles'
import { recordsListHeaderClass } from '../ui/recordsStyles'
import {
  skeletonCardClass,
  skeletonListClass,
  skeletonRecordsCardClass
} from '../ui/skeletonStyles'
import { timesheetDetailStatsClass } from '../ui/toolsPageStyles'

export function InstallmentCardListSkeleton({
  count = 3,
  filterChips = 0,
  footerStats = 0,
  variant = 'installment'
}: {
  count?: number
  filterChips?: number
  footerStats?: number
  variant?: 'installment' | 'treasury'
}) {
  const CardSkeleton =
    variant === 'treasury' ? TreasuryHoldingCardSkeleton : InstallmentCardSkeleton

  return (
    <div aria-busy="true" aria-label="در حال بارگذاری">
      <FilterChipsSkeleton count={filterChips} />
      <div className={skeletonListClass}>
        {Array.from({ length: count }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      {footerStats === 1 && <StatCardSkeleton wide />}
      {footerStats === 2 && (
        <div className={dashboardStatGridClass}>
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}
    </div>
  )
}

export function DangCardListSkeleton({
  count = 4,
  filterChips = 0,
  footerStat = false
}: {
  count?: number
  filterChips?: number
  footerStat?: boolean
}) {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری">
      <FilterChipsSkeleton count={filterChips} />
      <div className={skeletonListClass}>
        {Array.from({ length: count }, (_, index) => (
          <DangCardSkeleton key={index} />
        ))}
      </div>
      {footerStat && <StatCardSkeleton wide />}
    </div>
  )
}

export function WalletPageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری">
      <FilterChipsSkeleton count={0} />
      <div
        className={cardClassName(
          cn(
            installmentCardClass({}),
            dashboardOpeningCardClass,
            walletItemCardClass,
            skeletonCardClass
          )
        )}
        aria-hidden="true"
      >
        <div className={cn(installmentHeaderClass(), 'wallet-item-header')}>
          <div className={walletItemInfoClass} style={{ width: '100%' }}>
            <div className={walletItemTitleRowClass}>
              <Skeleton width="42%" height="0.95rem" />
              <Skeleton
                width="5rem"
                height="1.55rem"
                style={{ borderRadius: '999px', flexShrink: 0 }}
              />
            </div>
            <Skeleton width="36%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
          </div>
          <Skeleton
            variant="rect"
            width="0.85rem"
            height="0.85rem"
            style={{ borderRadius: '4px', flexShrink: 0 }}
          />
        </div>
      </div>
      <div className={skeletonListClass}>
        {Array.from({ length: count }, (_, index) => (
          <WalletAccountCardSkeleton key={index} />
        ))}
      </div>
      <StatCardSkeleton wide />
    </div>
  )
}

export function TimesheetDetailListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری">
      <div className={cn(dashboardStatGridClass, timesheetDetailStatsClass)}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className={skeletonListClass}>
        {Array.from({ length: count }, (_, index) => (
          <InstallmentCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

export function RecordListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className={cardClassName(cn('records-list-card', skeletonRecordsCardClass))}
      aria-busy="true"
      aria-label="در حال بارگذاری"
    >
      <div className={recordsListHeaderClass}>
        <Skeleton width="4rem" height="0.75rem" />
        <Skeleton width="3.5rem" height="1.25rem" style={{ borderRadius: '999px' }} />
      </div>
      {Array.from({ length: count }, (_, index) => (
        <RecordItemSkeleton key={index} />
      ))}
    </div>
  )
}
