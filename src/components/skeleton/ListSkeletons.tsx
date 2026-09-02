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
      <div className="skeleton-list">
        {Array.from({ length: count }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      {footerStats === 1 && <StatCardSkeleton wide />}
      {footerStats === 2 && (
        <div className="stat-grid dashboard-stat-grid">
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
      <div className="skeleton-list">
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
        className="card installment-card interactive-card dashboard-opening-card wallet-item-card skeleton-card"
        aria-hidden="true"
      >
        <div className="installment-header wallet-item-header">
          <div className="wallet-item-info" style={{ width: '100%' }}>
            <div className="wallet-item-title-row">
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
      <div className="skeleton-list">
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
      <div className="stat-grid dashboard-stat-grid timesheet-detail-stats">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="skeleton-list">
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
      className="card records-list-card skeleton-records-card"
      aria-busy="true"
      aria-label="در حال بارگذاری"
    >
      <div className="records-list-header">
        <Skeleton width="4rem" height="0.75rem" />
        <Skeleton width="3.5rem" height="1.25rem" style={{ borderRadius: '999px' }} />
      </div>
      {Array.from({ length: count }, (_, index) => (
        <RecordItemSkeleton key={index} />
      ))}
    </div>
  )
}
