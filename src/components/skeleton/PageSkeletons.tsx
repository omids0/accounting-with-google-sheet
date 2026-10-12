import AppSplash from './AppSplash'
import { SkeletonText } from './CardSkeletons'
import { InstallmentCardListSkeleton } from './ListSkeletons'
import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import {
  accordionCardChevronClass,
  accordionCardSummaryClass,
  accordionCardTextClass,
  accordionCardTitleClass,
  accordionCardTriggerClass
} from '../ui/accordionCardStyles'
import { cardClassName } from '../ui/Card'
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
import { skeletonCardClass, skeletonFormClass, skeletonFormRowClass } from '../ui/skeletonStyles'
import { receivableTotalCardClass } from '../ui/treasuryReceivableStyles'

export { DashboardSkeleton } from './DashboardSkeletons'

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
