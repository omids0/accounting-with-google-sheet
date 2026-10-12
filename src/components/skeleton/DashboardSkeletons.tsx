import {
  MoneySkeleton,
  ReportToolbarSkeleton,
  SkeletonActionButton,
  SkeletonText,
  StatCardSkeleton
} from './CardSkeletons'
import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import CalmBlock from '../CalmBlock'
import {
  calmBarTrackClass,
  calmDayBadgeClass,
  calmListClass,
  calmNoteClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass,
  calmSegmentClass
} from '../ui/calmListStyles'
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
  dashboardCalmPageClass,
  dashboardCellClass,
  dashboardGridClass,
  dashboardHeroStripClass,
  dashboardHeroStripItemClass,
  dashboardHeroStripValueClass,
  dashboardPeriodChipClass,
  dashboardPeriodRowClass,
  dashboardPeriodTodayClass
} from '../ui/dashboardCalmStyles'
import { recordsTypeSegmentClass } from '../ui/recordsStyles'
import {
  skeletonBreakdownClass,
  skeletonBreakdownRowClass,
  skeletonCardClass
} from '../ui/skeletonStyles'

/** One flat-list row: optional day badge, title + sub line (or a share bar), amount. */
function CalmRowSkeleton({ badge, bar }: { badge?: boolean; bar?: boolean }) {
  return (
    <li className={calmRowClass}>
      {badge ? (
        <span className={calmDayBadgeClass}>
          <Skeleton width="1rem" height="0.8rem" />
        </span>
      ) : null}
      <span className={calmRowMainClass}>
        <SkeletonText className={calmRowTitleClass} width="55%" />
        {bar ? (
          <span className={cn('block', calmBarTrackClass)} />
        ) : (
          <SkeletonText className={calmRowSubClass} width="35%" />
        )}
      </span>
      <SkeletonText className={calmRowEndClass} width="4.5rem" />
    </li>
  )
}

function CalmRowsSkeleton({
  count,
  badge,
  bar
}: {
  count: number
  badge?: boolean
  bar?: boolean
}) {
  return (
    <ul className={calmListClass}>
      {Array.from({ length: count }, (_, index) => (
        <CalmRowSkeleton key={index} badge={badge} bar={bar} />
      ))}
    </ul>
  )
}

/** The round 5 dashboard with placeholders: period row, hero, then the four flat blocks. */
function CalmDashboardSkeleton() {
  return (
    <div
      className={cn('skeleton-dashboard pointer-events-none', dashboardCalmPageClass)}
      aria-busy="true"
      aria-label="در حال بارگذاری داشبورد"
    >
      {/* On desktop the real period row lives in the header. */}
      <div className={cn(dashboardPeriodRowClass, 'xl:hidden')}>
        <span className={dashboardPeriodChipClass}>
          <Skeleton width="4.5rem" height="0.8rem" />
        </span>
        <SkeletonText className={dashboardPeriodTodayClass} width="6rem" />
      </div>

      <div className={dashboardGridClass}>
        <div className={cn(dashboardHeroCardClass, skeletonCardClass, dashboardCellClass.hero)}>
          <div className={dashboardHeroHeaderClass}>
            <SkeletonText className={cn(dashboardHeroLabelClass, 'justify-center')} width="7rem" />
            <SkeletonActionButton />
          </div>
          <MoneySkeleton size="hero" width="9rem" />
          <div className={dashboardHeroStripClass}>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={dashboardHeroStripItemClass}>
                <SkeletonText className="text-[0.7rem]" width="3.5rem" />
                <SkeletonText className={dashboardHeroStripValueClass} width="4rem" />
              </div>
            ))}
          </div>
        </div>

        <CalmBlock title="پیش رو" className={dashboardCellClass.upcoming}>
          <CalmRowsSkeleton count={3} badge />
        </CalmBlock>

        <CalmBlock title="تراکنش‌های اخیر" className={dashboardCellClass.recent}>
          <CalmRowsSkeleton count={5} badge />
        </CalmBlock>

        <CalmBlock
          title="تحلیل این ماه"
          className={dashboardCellClass.analysis}
          toolbar={
            <div
              className={cn(recordsTypeSegmentClass, calmSegmentClass, 'mb-1 self-start')}
              aria-hidden="true"
            >
              <button type="button" className="active" disabled tabIndex={-1}>
                هزینه
              </button>
              <button type="button" disabled tabIndex={-1}>
                درآمد
              </button>
            </div>
          }
        >
          <CalmRowsSkeleton count={3} bar />
        </CalmBlock>

        <CalmBlock title="دارایی و بدهی" className={dashboardCellClass.balance}>
          <CalmRowsSkeleton count={2} />
          <SkeletonText className={calmNoteClass} width="45%" />
        </CalmBlock>
      </div>
    </div>
  )
}

/** Report pages that open with a toolbar, the hero and stat/breakdown cards. */
function ReportDashboardSkeleton() {
  return (
    <div
      className={cn('skeleton-dashboard', dashboardPageClass)}
      aria-busy="true"
      aria-label="در حال بارگذاری گزارش"
    >
      <ReportToolbarSkeleton />

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

      {[4, 4].map((rows, card) => (
        <div key={card} className={cardClassName(cn(dashboardAssetsCardClass, skeletonCardClass))}>
          <Skeleton width="25%" height="0.9rem" />
          <div className={skeletonBreakdownClass}>
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className={skeletonBreakdownRowClass}>
                <Skeleton width="30%" height="0.8rem" />
                <Skeleton width="25%" height="0.8rem" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'report' }) {
  return variant === 'report' ? <ReportDashboardSkeleton /> : <CalmDashboardSkeleton />
}
