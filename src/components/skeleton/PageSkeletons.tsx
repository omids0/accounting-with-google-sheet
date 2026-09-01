import { Skeleton } from './Skeleton';
import AppIcon from '../AppIcon';

export function FilterChipsSkeleton({ count = 1 }: { count?: number }) {
  if (count <= 0) return null;

  return (
    <div className="active-filter-chips skeleton-filter-chips" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="skeleton-filter-chip">
          <Skeleton
            width={index === 0 ? '5.25rem' : '3.5rem'}
            height="0.72rem"
            style={{ borderRadius: '999px' }}
          />
        </span>
      ))}
    </div>
  );
}

export function ReportToolbarSkeleton() {
  return (
    <div className="card records-toolbar dashboard-toolbar skeleton-card" aria-hidden="true">
      <div className="records-toolbar-header">
        <div className="records-toolbar-heading">
          <Skeleton width="38%" height="1rem" />
          <Skeleton width="52%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
        </div>
        <Skeleton variant="rect" width="2.1rem" height="2.1rem" style={{ borderRadius: 'var(--radius-sm)' }} />
      </div>
      <div className="records-filter-section" style={{ marginTop: '0.85rem' }}>
        <Skeleton width="25%" height="0.75rem" />
        <div className="records-date-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} variant="rect" height="2rem" style={{ borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`stat-card skeleton-stat-card${wide ? ' stat-card-wide' : ''}`} aria-hidden="true">
      <Skeleton width="45%" height="0.75rem" />
      <Skeleton width="62%" height="1.25rem" style={{ marginTop: '0.5rem' }} />
    </div>
  );
}

export function InstallmentCardSkeleton() {
  return (
    <div className="card installment-card skeleton-card" aria-hidden="true">
      <div className="card-header-with-edit">
        <div className="installment-header">
          <div>
            <Skeleton width="55%" height="0.95rem" />
            <Skeleton width="42%" height="0.75rem" style={{ marginTop: '0.25rem' }} />
            <div className="progress-bar">
              <div className="progress-bar__meta">
                <div className="progress-bar__track skeleton-progress-track">
                  <Skeleton width="45%" height="100%" style={{ borderRadius: '999px' }} />
                </div>
                <Skeleton width="1.75rem" height="0.68rem" />
              </div>
            </div>
          </div>
        </div>
        <div className="card-action-buttons">
          <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
          <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
          <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

export function TreasuryHoldingCardSkeleton() {
  return (
    <div className="card installment-card treasury-holding-card skeleton-card" aria-hidden="true">
      <div className="installment-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Skeleton width="42%" height="0.95rem" />
          <Skeleton width="72%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
          <Skeleton width="48%" height="0.8rem" style={{ marginTop: '0.35rem' }} />
        </div>
        <Skeleton variant="rect" width="0.85rem" height="0.85rem" style={{ borderRadius: '4px', flexShrink: 0 }} />
      </div>
    </div>
  );
}

export function WalletAccountCardSkeleton() {
  return (
    <div className="card installment-card interactive-card wallet-item-card skeleton-card" aria-hidden="true">
      <div className="card-header-with-edit">
        <div className="installment-header wallet-item-header">
          <div className="wallet-item-info" style={{ width: '100%' }}>
            <div className="wallet-item-title-row">
              <Skeleton width="46%" height="0.95rem" />
              <Skeleton width="4.75rem" height="1.55rem" style={{ borderRadius: '999px', flexShrink: 0 }} />
            </div>
            <Skeleton width="54%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
          </div>
        </div>
        <div className="card-action-buttons">
          <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
          <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
          <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

export function InstallmentCardListSkeleton({
  count = 3,
  filterChips = 0,
  footerStats = 0,
  variant = 'installment',
}: {
  count?: number;
  filterChips?: number;
  footerStats?: number;
  variant?: 'installment' | 'treasury';
}) {
  const CardSkeleton = variant === 'treasury' ? TreasuryHoldingCardSkeleton : InstallmentCardSkeleton;

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
  );
}

export function DangCardSkeleton() {
  return (
    <div className="card dang-card skeleton-card" aria-hidden="true">
      <Skeleton
        variant="circle"
        width="1.2rem"
        height="1.2rem"
        style={{ marginTop: '0.2rem', flexShrink: 0 }}
      />
      <div className="dang-card-body">
        <div className="dang-card-header">
          <Skeleton width="45%" height="0.95rem" />
          <Skeleton width="5.5rem" height="1.75rem" style={{ borderRadius: '8px', flexShrink: 0 }} />
        </div>
        <Skeleton width="68%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
      </div>
      <div className="card-action-buttons">
        <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
        <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
      </div>
    </div>
  );
}

export function DangCardListSkeleton({
  count = 4,
  filterChips = 0,
  footerStat = false,
}: {
  count?: number;
  filterChips?: number;
  footerStat?: boolean;
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
  );
}

export function WalletPageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری">
      <FilterChipsSkeleton count={0} />
      <div className="card installment-card interactive-card dashboard-opening-card wallet-item-card skeleton-card" aria-hidden="true">
        <div className="installment-header wallet-item-header">
          <div className="wallet-item-info" style={{ width: '100%' }}>
            <div className="wallet-item-title-row">
              <Skeleton width="42%" height="0.95rem" />
              <Skeleton width="5rem" height="1.55rem" style={{ borderRadius: '999px', flexShrink: 0 }} />
            </div>
            <Skeleton width="36%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
          </div>
          <Skeleton variant="rect" width="0.85rem" height="0.85rem" style={{ borderRadius: '4px', flexShrink: 0 }} />
        </div>
      </div>
      <div className="skeleton-list">
        {Array.from({ length: count }, (_, index) => (
          <WalletAccountCardSkeleton key={index} />
        ))}
      </div>
      <StatCardSkeleton wide />
    </div>
  );
}

export function RecordItemSkeleton() {
  return (
    <div className="record-item skeleton-record-item" aria-hidden="true">
      <div className="record-item-main">
        <Skeleton width="50%" height="0.9rem" />
        <Skeleton width="35%" height="0.75rem" style={{ marginTop: '0.4rem' }} />
      </div>
      <div className="skeleton-record-actions">
        <Skeleton width="4.5rem" height="1rem" />
        <div className="card-action-buttons">
          <Skeleton variant="rect" width="2rem" height="2rem" style={{ borderRadius: 'var(--radius-sm)' }} />
          <Skeleton variant="rect" width="2rem" height="2rem" style={{ borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>
    </div>
  );
}

export function RecordListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="card records-list-card skeleton-records-card" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="records-list-header">
        <Skeleton width="4rem" height="0.75rem" />
        <Skeleton width="3.5rem" height="1.25rem" style={{ borderRadius: '999px' }} />
      </div>
      {Array.from({ length: count }, (_, index) => (
        <RecordItemSkeleton key={index} />
      ))}
    </div>
  );
}

export function DashboardSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'report' }) {
  return (
    <div className="skeleton-dashboard dashboard-page" aria-busy="true" aria-label="در حال بارگذاری داشبورد">
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
  );
}

export function TreasurySkeleton() {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری">
      <FilterChipsSkeleton count={0} />
      <div className="card treasury-price-card skeleton-card">
        <div className="treasury-price-header">
          <Skeleton width="45%" height="0.85rem" />
          <Skeleton variant="rect" width="4.5rem" height="1.75rem" style={{ borderRadius: 'var(--radius-sm)' }} />
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
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="skeleton-form" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="records-type-segment data-entry-type-segment" aria-hidden="true">
        <Skeleton variant="rect" height="2.25rem" style={{ flex: 1, borderRadius: 'calc(var(--radius) - 2px)' }} />
        <Skeleton variant="rect" height="2.25rem" style={{ flex: 1, borderRadius: 'calc(var(--radius) - 2px)' }} />
      </div>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="skeleton-form-row">
          <Skeleton width="25%" height="0.8rem" style={{ marginBottom: '0.4rem' }} />
          <Skeleton width="100%" height="2.5rem" />
        </div>
      ))}
      <Skeleton variant="rect" width="100%" height="2.75rem" style={{ marginTop: '0.5rem', borderRadius: 'var(--radius-sm)' }} />
    </div>
  );
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
  );
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
          <Skeleton variant="rect" width="100%" height="5rem" style={{ borderRadius: 'var(--radius)' }} />
          <div className="app-loading-stat-row">
            <Skeleton variant="rect" height="3.5rem" style={{ flex: 1, borderRadius: 'var(--radius-sm)' }} />
            <Skeleton variant="rect" height="3.5rem" style={{ flex: 1, borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
