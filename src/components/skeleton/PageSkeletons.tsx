import { Skeleton } from './Skeleton'
import AppIcon from '../AppIcon'
import { FilterChipsSkeleton, ReportToolbarSkeleton, StatCardSkeleton } from './CardSkeletons'
import { InstallmentCardListSkeleton } from './ListSkeletons'

export {
  FilterChipsSkeleton,
  ReportToolbarSkeleton,
  StatCardSkeleton,
  InstallmentCardSkeleton,
  TreasuryHoldingCardSkeleton,
  WalletAccountCardSkeleton,
  DangCardSkeleton,
  RecordItemSkeleton
} from './CardSkeletons'

export {
  InstallmentCardListSkeleton,
  DangCardListSkeleton,
  WalletPageSkeleton,
  RecordListSkeleton,
  TimesheetDetailListSkeleton
} from './ListSkeletons'

export function DashboardSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'report' }) {
  return (
    <div
      className="skeleton-dashboard dashboard-page"
      aria-busy="true"
      aria-label="در حال بارگذاری داشبورد"
    >
      {variant === 'dashboard' ? <FilterChipsSkeleton count={1} /> : <ReportToolbarSkeleton />}

      <div className="card dashboard-hero-card skeleton-card">
        <Skeleton width="35%" height="0.8rem" />
        <Skeleton width="55%" height="2rem" style={{ marginTop: '0.75rem' }} />
        <Skeleton width="70%" height="0.75rem" style={{ marginTop: '0.65rem' }} />
      </div>

      <div className="dashboard-flow-section">
        <div className="stat-grid dashboard-stat-grid">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <StatCardSkeleton wide />
        <StatCardSkeleton wide />
      </div>

      <div className="card dashboard-assets-card skeleton-card">
        <Skeleton width="25%" height="0.9rem" />
        <div className="skeleton-breakdown">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-breakdown-row">
              <Skeleton width="30%" height="0.8rem" />
              <Skeleton width="25%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>

      <div className="card dashboard-assets-card skeleton-card">
        <Skeleton width="25%" height="0.9rem" />
        <div className="skeleton-breakdown">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-breakdown-row">
              <Skeleton width="35%" height="0.8rem" />
              <Skeleton width="25%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TreasurySkeleton() {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری">
      <FilterChipsSkeleton count={0} />
      <div className="card treasury-price-card skeleton-card">
        <div className="treasury-price-header">
          <Skeleton width="45%" height="0.85rem" />
          <Skeleton
            variant="rect"
            width="4.5rem"
            height="1.75rem"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <div className="treasury-price-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="treasury-price-item">
              <Skeleton width="60%" height="0.8rem" />
              <Skeleton width="40%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>
      <InstallmentCardListSkeleton count={2} variant="treasury" />
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="skeleton-form" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="records-type-segment data-entry-type-segment" aria-hidden="true">
        <Skeleton
          variant="rect"
          height="2.25rem"
          style={{ flex: 1, borderRadius: 'calc(var(--radius) - 2px)' }}
        />
        <Skeleton
          variant="rect"
          height="2.25rem"
          style={{ flex: 1, borderRadius: 'calc(var(--radius) - 2px)' }}
        />
      </div>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="skeleton-form-row">
          <Skeleton width="25%" height="0.8rem" style={{ marginBottom: '0.4rem' }} />
          <Skeleton width="100%" height="2.5rem" />
        </div>
      ))}
      <Skeleton
        variant="rect"
        width="100%"
        height="2.75rem"
        style={{ marginTop: '0.5rem', borderRadius: 'var(--radius-sm)' }}
      />
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="skeleton-settings" aria-busy="true" aria-label="در حال بارگذاری تنظیمات">
      <div className="card skeleton-card">
        <Skeleton width="30%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="2.5rem" style={{ marginBottom: '0.75rem' }} />
        <Skeleton width="100%" height="2.5rem" />
      </div>
      <div className="card skeleton-card">
        <Skeleton width="25%" height="1rem" style={{ marginBottom: '1rem' }} />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton-form-row">
            <Skeleton width="100%" height="2.25rem" />
          </div>
        ))}
      </div>
      <div className="card skeleton-card">
        <Skeleton width="35%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="5rem" />
      </div>
    </div>
  )
}

export function AppLoadingSkeleton() {
  return (
    <div className="app-loading" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="app-loading-inner app-loading-skeleton">
        <span className="app-loading-icon">
          <AppIcon name="dashboard" />
        </span>
        <Skeleton width="8rem" height="1rem" />
        <div className="app-loading-cards">
          <FilterChipsSkeleton count={1} />
          <Skeleton
            variant="rect"
            width="100%"
            height="5rem"
            style={{ borderRadius: 'var(--radius)' }}
          />
          <div className="app-loading-stat-row">
            <Skeleton
              variant="rect"
              height="3.5rem"
              style={{ flex: 1, borderRadius: 'var(--radius-sm)' }}
            />
            <Skeleton
              variant="rect"
              height="3.5rem"
              style={{ flex: 1, borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
