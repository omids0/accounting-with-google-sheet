import { Skeleton } from './Skeleton';

export function InstallmentCardSkeleton() {
  return (
    <div className="card installment-card skeleton-card" aria-hidden="true">
      <div className="skeleton-card-header">
        <div className="skeleton-card-body">
          <Skeleton width="55%" height="0.95rem" />
          <Skeleton width="40%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
          <Skeleton width="100%" height="4px" style={{ marginTop: '0.65rem', borderRadius: '2px' }} />
        </div>
        <Skeleton variant="rect" width="1rem" height="1rem" style={{ borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export function InstallmentCardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="در حال بارگذاری">
      {Array.from({ length: count }, (_, i) => (
        <InstallmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DangCardSkeleton() {
  return (
    <div className="card dang-card skeleton-card" aria-hidden="true">
      <Skeleton variant="circle" width="1.25rem" height="1.25rem" />
      <div className="skeleton-dang-body">
        <div className="skeleton-dang-row">
          <Skeleton width="45%" height="0.95rem" />
          <Skeleton width="28%" height="0.95rem" />
        </div>
        <Skeleton width="60%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
        <Skeleton width="50%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
      </div>
    </div>
  );
}

export function DangCardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="در حال بارگذاری">
      {Array.from({ length: count }, (_, i) => (
        <DangCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RecordItemSkeleton() {
  return (
    <div className="record-item skeleton-record-item" aria-hidden="true">
      <div>
        <Skeleton width="50%" height="0.9rem" />
        <Skeleton width="35%" height="0.75rem" style={{ marginTop: '0.4rem' }} />
      </div>
      <Skeleton width="4.5rem" height="1rem" />
    </div>
  );
}

export function RecordListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="card skeleton-records-card" style={{ padding: '0 1rem' }} aria-busy="true" aria-label="در حال بارگذاری">
      {Array.from({ length: count }, (_, i) => (
        <RecordItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard dashboard-page" aria-busy="true" aria-label="در حال بارگذاری داشبورد">
      <div className="card records-toolbar dashboard-toolbar skeleton-card">
        <div className="records-toolbar-header">
          <div className="records-toolbar-heading">
            <Skeleton width="35%" height="1rem" />
            <Skeleton width="55%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
          </div>
          <Skeleton variant="rect" width="2.25rem" height="2.25rem" style={{ borderRadius: 'var(--radius-sm)' }} />
        </div>
        <div className="records-filter-section" style={{ marginTop: '0.85rem' }}>
          <Skeleton width="25%" height="0.75rem" />
          <div className="records-date-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} variant="rect" height="2rem" style={{ borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="card dashboard-hero-card skeleton-card">
        <Skeleton width="35%" height="0.8rem" />
        <Skeleton width="55%" height="2rem" style={{ marginTop: '0.75rem' }} />
        <Skeleton width="70%" height="0.75rem" style={{ marginTop: '0.65rem' }} />
      </div>

      <div className="dashboard-flow-section">
        <div className="stat-grid dashboard-stat-grid">
          <div className="stat-card skeleton-stat-card">
            <Skeleton width="50%" height="0.75rem" />
            <Skeleton width="65%" height="1.25rem" style={{ marginTop: '0.5rem' }} />
          </div>
          <div className="stat-card skeleton-stat-card">
            <Skeleton width="50%" height="0.75rem" />
            <Skeleton width="65%" height="1.25rem" style={{ marginTop: '0.5rem' }} />
          </div>
        </div>
        <div className="stat-card stat-card-wide skeleton-stat-card">
          <Skeleton width="30%" height="0.75rem" />
          <Skeleton width="45%" height="1.25rem" style={{ marginTop: '0.5rem' }} />
        </div>
        <div className="stat-card stat-card-wide skeleton-stat-card">
          <Skeleton width="35%" height="0.75rem" />
          <Skeleton width="50%" height="1.25rem" style={{ marginTop: '0.5rem' }} />
        </div>
      </div>

      <div className="card dashboard-assets-card skeleton-card">
        <Skeleton width="25%" height="0.9rem" />
        <div className="skeleton-breakdown">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton-breakdown-row">
              <Skeleton width="30%" height="0.8rem" />
              <Skeleton width="25%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>

      <div className="card dashboard-assets-card skeleton-card">
        <Skeleton width="25%" height="0.9rem" />
        <div className="skeleton-breakdown">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton-breakdown-row">
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
    <div className="skeleton-list" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="card treasury-price-card skeleton-card">
        <div className="treasury-price-header">
          <Skeleton width="45%" height="0.85rem" />
          <Skeleton variant="rect" width="4.5rem" height="1.75rem" style={{ borderRadius: 'var(--radius-sm)' }} />
        </div>
        <div className="treasury-price-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="treasury-price-item">
              <Skeleton width="60%" height="0.8rem" />
              <Skeleton width="40%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>
      <InstallmentCardListSkeleton count={2} />
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
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="skeleton-form-row">
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
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton-form-row">
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
        <span className="app-loading-icon">📊</span>
        <Skeleton width="8rem" height="1rem" />
        <div className="app-loading-cards">
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
