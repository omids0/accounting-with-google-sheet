import { lazy, Suspense } from 'react'

import BuildingBlock from './BuildingBlock'
import type { PeriodFlow } from '../../services/buildingReports'
import { formatPersianNumber } from '../../utils/formatMoney'
import DeferredMount from '../DeferredMount'
import MoneyText from '../MoneyText'
import {
  buildingRowTitleClass,
  buildingRowSubClass,
  buildingRowEndClass,
  buildingEmptyClass
} from '../ui/buildingStyles'
import {
  calmBarClass,
  calmBarTrackClass,
  calmListClass,
  calmRowClass,
  calmRowMainClass
} from '../ui/calmListStyles'

const LazyCategoryDonutChart = lazy(() => import('../charts/CategoryDonutChart'))

const share = (amount: number, total: number) => (total ? Math.round((amount / total) * 100) : 0)

/** «هزینه‌ها به تفکیک دسته»: the donut of the period's spending (transfers and corrections left out). */
export function SpendingByCategory({ flow }: { flow: PeriodFlow }) {
  return (
    <BuildingBlock title="هزینه‌ها به تفکیک دسته">
      {flow.byCategory.length ? (
        <DeferredMount>
          <Suspense fallback={null}>
            <LazyCategoryDonutChart data={flow.byCategory} tone="expense" />
          </Suspense>
        </DeferredMount>
      ) : (
        <p className={buildingEmptyClass}>در این بازه هزینه‌ای ثبت نشده</p>
      )}
    </BuildingBlock>
  )
}

/** «جاری در برابر عمرانی»: each expense kind's amount and share of the period's spending. */
export function SpendingByKind({ flow }: { flow: PeriodFlow }) {
  return (
    <BuildingBlock title="هزینه به تفکیک نوع">
      {flow.byKind.length ? (
        <ul className={calmListClass}>
          {flow.byKind.map(item => {
            const percent = share(item.amount, flow.expense)

            return (
              <li key={item.value || 'none'} className={calmRowClass}>
                <div className={calmRowMainClass}>
                  <span className={buildingRowTitleClass}>{item.label}</span>
                  <span className={buildingRowSubClass}>
                    {formatPersianNumber(percent)}٪ از هزینه‌ها
                  </span>
                  <div className={calmBarTrackClass} aria-hidden="true">
                    <div
                      className={calmBarClass}
                      style={{ width: `${percent}%`, background: 'var(--color-primary)' }}
                    />
                  </div>
                </div>
                <span className={buildingRowEndClass}>
                  <MoneyText amount={item.amount} />
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={buildingEmptyClass}>در این بازه هزینه‌ای ثبت نشده</p>
      )}
    </BuildingBlock>
  )
}
