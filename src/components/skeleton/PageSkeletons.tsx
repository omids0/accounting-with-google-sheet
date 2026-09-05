import { FilterChipsSkeleton, ReportToolbarSkeleton, StatCardSkeleton } from './CardSkeletons'
import { InstallmentCardListSkeleton } from './ListSkeletons'
import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import { cardClassName } from '../ui/Card'
import {
  dashboardAssetsCardClass,
  dashboardFlowSectionClass,
  dashboardHeroCardClass,
  dashboardPageClass,
  dashboardStatGridClass
} from '../ui/chartStyles'
import {
  appLoadingClass,
  appLoadingDotClass,
  appLoadingDotDelayClasses,
  appLoadingDotsClass,
  appLoadingInlineClass
} from '../ui/loginStyles'
import { recordsTypeSegmentClass, dataEntryTypeSegmentClass } from '../ui/recordsStyles'
import {
  skeletonBreakdownClass,
  skeletonBreakdownRowClass,
  skeletonCardClass,
  skeletonFormClass,
  skeletonFormRowClass,
  skeletonSettingsClass
} from '../ui/skeletonStyles'
import {
  treasuryPriceCardClass,
  treasuryPriceGridClass,
  treasuryPriceHeaderClass,
  treasuryPriceItemClass
} from '../ui/treasuryReceivableStyles'

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
      className={cn('skeleton-dashboard', dashboardPageClass)}
      aria-busy="true"
      aria-label="در حال بارگذاری داشبورد"
    >
      {variant === 'dashboard' ? <FilterChipsSkeleton count={1} /> : <ReportToolbarSkeleton />}

      <div className={cardClassName(cn(dashboardHeroCardClass, skeletonCardClass))}>
        <Skeleton width="35%" height="0.8rem" />
        <Skeleton width="55%" height="2rem" style={{ marginTop: '0.75rem' }} />
        <Skeleton width="70%" height="0.75rem" style={{ marginTop: '0.65rem' }} />
      </div>

      <div className={dashboardFlowSectionClass}>
        <div className={dashboardStatGridClass}>
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <StatCardSkeleton wide />
        <StatCardSkeleton wide />
      </div>

      <div className={cardClassName(cn(dashboardAssetsCardClass, skeletonCardClass))}>
        <Skeleton width="25%" height="0.9rem" />
        <div className={skeletonBreakdownClass}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={skeletonBreakdownRowClass}>
              <Skeleton width="30%" height="0.8rem" />
              <Skeleton width="25%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>

      <div className={cardClassName(cn(dashboardAssetsCardClass, skeletonCardClass))}>
        <Skeleton width="25%" height="0.9rem" />
        <div className={skeletonBreakdownClass}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={skeletonBreakdownRowClass}>
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
      <div className={cardClassName(cn(treasuryPriceCardClass, skeletonCardClass))}>
        <div className={treasuryPriceHeaderClass}>
          <Skeleton width="45%" height="0.85rem" />
          <Skeleton
            variant="rect"
            width="4.5rem"
            height="1.75rem"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <div className={treasuryPriceGridClass}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={treasuryPriceItemClass}>
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
    <div className={skeletonFormClass} aria-busy="true" aria-label="در حال بارگذاری">
      <div className={cn(recordsTypeSegmentClass, dataEntryTypeSegmentClass)} aria-hidden="true">
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
        <div key={index} className={skeletonFormRowClass}>
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
    <div className={skeletonSettingsClass} aria-busy="true" aria-label="در حال بارگذاری تنظیمات">
      <div className={cardClassName(skeletonCardClass)}>
        <Skeleton width="30%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="2.5rem" style={{ marginBottom: '0.75rem' }} />
        <Skeleton width="100%" height="2.5rem" />
      </div>
      <div className={cardClassName(skeletonCardClass)}>
        <Skeleton width="25%" height="1rem" style={{ marginBottom: '1rem' }} />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={skeletonFormRowClass}>
            <Skeleton width="100%" height="2.25rem" />
          </div>
        ))}
      </div>
      <div className={cardClassName(skeletonCardClass)}>
        <Skeleton width="35%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="5rem" />
      </div>
    </div>
  )
}

export function AppLoadingSkeleton({
  variant = 'fullscreen'
}: {
  variant?: 'fullscreen' | 'inline'
}) {
  const containerClass = variant === 'inline' ? appLoadingInlineClass : appLoadingClass

  return (
    <div className={containerClass} aria-busy="true" aria-label="در حال بارگذاری">
      <div className={appLoadingDotsClass} role="status" aria-live="polite">
        {appLoadingDotDelayClasses.map(delayClass => (
          <span key={delayClass} className={cn(appLoadingDotClass, delayClass)} />
        ))}
        <span className="sr-only">در حال بارگذاری</span>
      </div>
    </div>
  )
}
