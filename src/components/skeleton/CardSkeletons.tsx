import { Skeleton, SkeletonProgressFill } from './Skeleton'
import { cn } from '../../utils/cn'
import { cardClassName } from '../ui/Card'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardBodyClass,
  dangCardHeaderClass,
  installmentCardClass,
  installmentHeaderClass,
  walletItemCardClass,
  walletItemInfoClass,
  walletItemTitleRowClass
} from '../ui/featureCardStyles'
import { progressBarMetaClass } from '../ui/progressStyles'
import {
  recordsDateGridClass,
  recordsFilterSectionClassName,
  recordsToolbarHeaderClass,
  recordsToolbarHeadingClass
} from '../ui/recordsStyles'
import {
  skeletonActionBtnSizeClass,
  skeletonCardClass,
  skeletonFilterChipClass,
  skeletonFilterChipsClass,
  skeletonRecordActionsClass,
  skeletonRecordItemClass,
  skeletonStatCardClass
} from '../ui/skeletonStyles'
import { treasuryHoldingCardClass } from '../ui/treasuryReceivableStyles'

export function FilterChipsSkeleton({ count = 1 }: { count?: number }) {
  if (count <= 0) return null

  return (
    <div className={skeletonFilterChipsClass} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={skeletonFilterChipClass}>
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

export function StatCardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={cn('stat-card', skeletonStatCardClass, wide && 'stat-card-wide')}
      aria-hidden="true"
    >
      <Skeleton width="45%" height="0.75rem" />
      <Skeleton width="62%" height="1.25rem" style={{ marginTop: '0.5rem' }} />
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
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <Skeleton width="42%" height="0.95rem" />
          <Skeleton width="72%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
          <Skeleton width="48%" height="0.8rem" style={{ marginTop: '0.35rem' }} />
        </div>
        <Skeleton variant="rect" className={skeletonActionBtnSizeClass} style={{ flexShrink: 0 }} />
      </div>
    </div>
  )
}

export function WalletAccountCardSkeleton() {
  return (
    <div
      className={cn(installmentCardClass({}), walletItemCardClass, skeletonCardClass)}
      aria-hidden="true"
    >
      <div className={cardHeaderWithEditClass}>
        <div className={cn(installmentHeaderClass(), 'wallet-item-header')}>
          <div className={walletItemInfoClass} style={{ width: '100%' }}>
            <div className={walletItemTitleRowClass}>
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
        <div className={cardActionButtonsClass}>
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
        </div>
      </div>
    </div>
  )
}

export function DangCardSkeleton() {
  return (
    <div className={cardClassName(cn('dang-card', skeletonCardClass))} aria-hidden="true">
      <Skeleton
        variant="circle"
        width="1.2rem"
        height="1.2rem"
        style={{ marginTop: '0.2rem', flexShrink: 0 }}
      />
      <div className={dangCardBodyClass}>
        <div className={dangCardHeaderClass}>
          <Skeleton width="45%" height="0.95rem" />
          <Skeleton
            width="5.5rem"
            height="1.75rem"
            style={{ borderRadius: '8px', flexShrink: 0 }}
          />
        </div>
        <Skeleton width="68%" height="0.75rem" style={{ marginTop: '0.35rem' }} />
      </div>
      <div className={cardActionButtonsClass}>
        <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
        <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
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
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
          <Skeleton variant="rect" className={skeletonActionBtnSizeClass} />
        </div>
      </div>
    </div>
  )
}
