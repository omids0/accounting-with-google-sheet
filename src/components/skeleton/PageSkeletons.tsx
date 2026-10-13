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
import {
  recordsTypeSegmentClass,
  dataEntryPageClass,
  dataEntryTypeSegmentClass
} from '../ui/recordsStyles'
import {
  settingsPageClass,
  settingsPaneContentClass,
  settingsPaneNavClass,
  settingsPaneNavItemClass,
  settingsSectionCardClass,
  settingsSectionClass,
  settingsSectionIconClass,
  settingsTwoPaneClass
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
      table
    />
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div
      className={cn(skeletonFormClass, dataEntryPageClass)}
      aria-busy="true"
      aria-label="در حال بارگذاری"
    >
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
      {/* Two fields per row on desktop, like the entry form. */}
      <div className="contents xl:grid xl:grid-cols-2 xl:gap-x-5 xl:gap-y-[0.65rem] xl:[&>*]:mt-0">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className={skeletonFormRowClass}>
            <Skeleton width="25%" height="0.8rem" style={{ marginBottom: '0.4rem' }} />
            <Skeleton width="100%" height="2.5rem" />
          </div>
        ))}
      </div>
      <Skeleton
        variant="rect"
        width="100%"
        height="2.75rem"
        style={{ marginTop: '0.5rem', borderRadius: 'var(--radius-sm)' }}
      />
    </div>
  )
}

/**
 * The four collapsed sections of the settings page, built from SettingsSection's
 * classes; on desktop the section list and an empty content pane.
 */
export function SettingsSkeleton() {
  return (
    <div className={settingsPageClass} aria-busy="true" aria-label="در حال بارگذاری تنظیمات">
      <div className={cn(settingsTwoPaneClass, 'hidden xl:grid')} aria-hidden="true">
        <div className={settingsPaneNavClass}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={settingsPaneNavItemClass(index === 0)}>
              <Skeleton width="60%" height="0.9rem" />
            </div>
          ))}
        </div>
        <div className={cn(cardClassName(settingsPaneContentClass), skeletonCardClass)}>
          <Skeleton width="30%" height="1rem" />
          <Skeleton width="100%" height="8rem" />
        </div>
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <section key={index} className={cn(settingsSectionClass, 'xl:hidden')} aria-hidden="true">
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
