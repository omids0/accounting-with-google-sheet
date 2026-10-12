import AppSplash from './AppSplash'
import {
  FilterChipsSkeleton,
  MoneySkeleton,
  ReportToolbarSkeleton,
  SkeletonActionButton,
  SkeletonText,
  StatCardSkeleton
} from './CardSkeletons'
import { InstallmentCardListSkeleton } from './ListSkeletons'
import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import { dashboardRemindersCardClass } from '../dashboard/dashboardReminderStyles'
import {
  accordionCardChevronClass,
  accordionCardSummaryClass,
  accordionCardTextClass,
  accordionCardTitleClass,
  accordionCardTriggerClass
} from '../ui/accordionCardStyles'
import { cardClassName } from '../ui/Card'
import {
  dashboardAssetsCardClass,
  dashboardFlowSectionClass,
  dashboardHeroCardClass,
  dashboardHeroHeaderClass,
  dashboardHeroHintClass,
  dashboardHeroLabelClass,
  dashboardPageClass
} from '../ui/chartStyles'
import {
  appLoadingDotClass,
  appLoadingDotDelayClasses,
  appLoadingDotsClass,
  appLoadingInlineClass
} from '../ui/loginStyles'
import { recordsTypeSegmentClass, dataEntryTypeSegmentClass } from '../ui/recordsStyles'
import {
  settingsPageClass,
  settingsSectionCardClass,
  settingsSectionClass,
  settingsSectionIconClass
} from '../ui/settingsStyles'
import {
  skeletonBreakdownClass,
  skeletonBreakdownRowClass,
  skeletonCardClass,
  skeletonFormClass,
  skeletonFormRowClass
} from '../ui/skeletonStyles'
import { receivableTotalCardClass } from '../ui/treasuryReceivableStyles'

export {
  FilterChipsSkeleton,
  ReportToolbarSkeleton,
  StatCardSkeleton,
  InstallmentCardSkeleton,
  TreasuryHoldingCardSkeleton,
  WalletAccountCardSkeleton,
  DangCardSkeleton,
  RecordItemSkeleton,
  SkeletonText
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

      <div className={cn(dashboardHeroCardClass, skeletonCardClass)}>
        <div className={dashboardHeroHeaderClass}>
          <SkeletonText className={cn(dashboardHeroLabelClass, 'justify-center')} width="7rem" />
          <SkeletonActionButton />
        </div>
        <MoneySkeleton size="hero" width="9rem" />
        <SkeletonText className={cn(dashboardHeroHintClass, 'justify-center')} width="80%" />
      </div>

      <div className={dashboardFlowSectionClass}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton wide />
        <StatCardSkeleton wide />
      </div>

      <div className={cardClassName(cn(dashboardRemindersCardClass, skeletonCardClass))}>
        <Skeleton width="40%" height="0.9rem" />
        <Skeleton width="75%" height="0.72rem" style={{ marginTop: '0.55rem' }} />
        <div className={skeletonBreakdownClass}>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className={skeletonBreakdownRowClass}>
              <Skeleton width="45%" height="0.8rem" />
              <Skeleton width="20%" height="0.8rem" />
            </div>
          ))}
        </div>
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

/** Holdings only: the treasury page keeps its own filter bar and price card on screen. */
export function TreasurySkeleton() {
  return (
    <InstallmentCardListSkeleton
      count={2}
      variant="treasury"
      footerStats={1}
      footerClassName={receivableTotalCardClass}
    />
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

/** The four collapsed sections of the settings page, built from SettingsSection's classes. */
export function SettingsSkeleton() {
  return (
    <div className={settingsPageClass} aria-busy="true" aria-label="در حال بارگذاری تنظیمات">
      {Array.from({ length: 4 }, (_, index) => (
        <section key={index} className={settingsSectionClass} aria-hidden="true">
          <div className={cn(cardClassName(settingsSectionCardClass(false)), skeletonCardClass)}>
            <div className={accordionCardTriggerClass}>
              <span className={settingsSectionIconClass(false)}>
                <Skeleton variant="rect" width="1.25rem" height="1.25rem" />
              </span>
              <span className={accordionCardTextClass}>
                <SkeletonText className={accordionCardTitleClass} width="5rem" />
                <SkeletonText className={accordionCardSummaryClass} width="10rem" />
              </span>
              <span className={accordionCardChevronClass(false)}>
                <Skeleton width="1rem" height="1rem" />
              </span>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

export function AppLoadingSkeleton({
  variant = 'fullscreen'
}: {
  variant?: 'fullscreen' | 'inline'
}) {
  if (variant === 'fullscreen') return <AppSplash />

  return (
    <div className={appLoadingInlineClass} aria-busy="true" aria-label="در حال بارگذاری">
      <div className={appLoadingDotsClass} role="status" aria-live="polite">
        {appLoadingDotDelayClasses.map(delayClass => (
          <span key={delayClass} className={cn(appLoadingDotClass, delayClass)} />
        ))}
        <span className="sr-only">در حال بارگذاری</span>
      </div>
    </div>
  )
}
