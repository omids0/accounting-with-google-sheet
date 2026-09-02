import { Skeleton } from './Skeleton'

export function FilterChipsSkeleton({ count = 1 }: { count?: number }) {
  if (count <= 0) return null

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
  )
}

export function ReportToolbarSkeleton() {
  return (
    <div className="card records-toolbar dashboard-toolbar skeleton-card" aria-hidden="true">
      <div className="records-toolbar-header">
        <div className="records-toolbar-heading">
          <Skeleton width="38%" height="1rem" />
          <Skeleton width="52%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
        </div>
        <Skeleton
          variant="rect"
          width="2.1rem"
          height="2.1rem"
          style={{ borderRadius: 'var(--radius-sm)' }}
        />
      </div>
      <div className="records-filter-section" style={{ marginTop: '0.85rem' }}>
        <Skeleton width="25%" height="0.75rem" />
        <div className="records-date-grid">
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

export function StatCardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={`stat-card skeleton-stat-card${wide ? ' stat-card-wide' : ''}`}
      aria-hidden="true"
    >
      <Skeleton width="45%" height="0.75rem" />
      <Skeleton width="62%" height="1.25rem" style={{ marginTop: '0.5rem' }} />
    </div>
  )
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
  )
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
        <Skeleton
          variant="rect"
          width="0.85rem"
          height="0.85rem"
          style={{ borderRadius: '4px', flexShrink: 0 }}
        />
      </div>
    </div>
  )
}

export function WalletAccountCardSkeleton() {
  return (
    <div
      className="card installment-card interactive-card wallet-item-card skeleton-card"
      aria-hidden="true"
    >
      <div className="card-header-with-edit">
        <div className="installment-header wallet-item-header">
          <div className="wallet-item-info" style={{ width: '100%' }}>
            <div className="wallet-item-title-row">
              <Skeleton width="46%" height="0.95rem" />
              <Skeleton
                width="4.75rem"
                height="1.55rem"
                style={{ borderRadius: '999px', flexShrink: 0 }}
              />
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
  )
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
          <Skeleton
            width="5.5rem"
            height="1.75rem"
            style={{ borderRadius: '8px', flexShrink: 0 }}
          />
        </div>
        <Skeleton width="68%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
      </div>
      <div className="card-action-buttons">
        <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
        <Skeleton variant="rect" width="1.9rem" height="1.9rem" style={{ borderRadius: '8px' }} />
      </div>
    </div>
  )
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
          <Skeleton
            variant="rect"
            width="2rem"
            height="2rem"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
          <Skeleton
            variant="rect"
            width="2rem"
            height="2rem"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
        </div>
      </div>
    </div>
  )
}
