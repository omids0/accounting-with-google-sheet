import type { ReactNode } from 'react'

import {
  DangCardSkeleton,
  type DangCardSkeletonShape,
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
  listCardsContainerClass,
  listModulePageClass,
  walletItemCardClass,
  walletItemInfoClass,
  walletItemTitleRowClass
} from '../ui/featureCardStyles'
import { recordsListHeaderClass } from '../ui/recordsStyles'
import { skeletonCardClass, skeletonRecordsCardClass } from '../ui/skeletonStyles'
import { timesheetDetailStatsClass } from '../ui/toolsPageStyles'
import { receivableTotalCardClass } from '../ui/treasuryReceivableStyles'
import { walletCardsListClass } from '../wallet/walletCardStyles'

/**
 * Same vertical rhythm as a list page. `filterBar` is only for skeletons that
 * replace a whole page with filters; inside a page the real filter bar is
 * already on screen above the skeleton.
 */
function ListSkeletonFrame({ filterBar, children }: { filterBar?: boolean; children: ReactNode }) {
  return (
    <div className={listModulePageClass} aria-busy="true" aria-label="در حال بارگذاری">
      {filterBar && <FilterChipsSkeleton count={0} />}
      {children}
    </div>
  )
}

function FooterStats({ count, className }: { count: number; className?: string }) {
  if (count === 1) return <StatCardSkeleton wide className={className} />
  if (count !== 2) return null

  return (
    <div className={dashboardStatGridClass}>
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  )
}

export function InstallmentCardListSkeleton({
  count = 3,
  filterBar = false,
  footerStats = 0,
  footerClassName,
  variant = 'installment'
}: {
  count?: number
  filterBar?: boolean
  footerStats?: number
  footerClassName?: string
  variant?: 'installment' | 'treasury'
}) {
  const CardSkeleton =
    variant === 'treasury' ? TreasuryHoldingCardSkeleton : InstallmentCardSkeleton

  return (
    <ListSkeletonFrame filterBar={filterBar}>
      <div className={listCardsContainerClass}>
        {Array.from({ length: count }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <FooterStats count={footerStats} className={footerClassName} />
    </ListSkeletonFrame>
  )
}

export function DangCardListSkeleton({
  count = 3,
  filterBar = false,
  footerStats = 0,
  footerClassName,
  ...shape
}: DangCardSkeletonShape & {
  count?: number
  filterBar?: boolean
  footerStats?: number
  footerClassName?: string
}) {
  return (
    <ListSkeletonFrame filterBar={filterBar}>
      <div className={listCardsContainerClass}>
        {Array.from({ length: count }, (_, index) => (
          <DangCardSkeleton key={index} {...shape} />
        ))}
      </div>
      <FooterStats count={footerStats} className={footerClassName} />
    </ListSkeletonFrame>
  )
}

export function WalletPageSkeleton({ count = 2 }: { count?: number }) {
  return (
    <ListSkeletonFrame>
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
        </div>
      </div>
      <div className={walletCardsListClass}>
        {Array.from({ length: count }, (_, index) => (
          <WalletAccountCardSkeleton key={index} />
        ))}
      </div>
      <StatCardSkeleton wide className={receivableTotalCardClass} />
    </ListSkeletonFrame>
  )
}

export function TimesheetDetailListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ListSkeletonFrame>
      <div className={cn(dashboardStatGridClass, timesheetDetailStatsClass)}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className={listCardsContainerClass}>
        {Array.from({ length: count }, (_, index) => (
          <InstallmentCardSkeleton key={index} />
        ))}
      </div>
    </ListSkeletonFrame>
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
