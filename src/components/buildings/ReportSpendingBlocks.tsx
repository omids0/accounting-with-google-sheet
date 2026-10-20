import { lazy, Suspense } from 'react'

import type { PeriodFlow } from '../../services/buildingReports'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import DeferredMount from '../DeferredMount'
import MoneyText from '../MoneyText'
import {
  calmBarClass,
  calmBarTrackClass,
  calmEmptyClass,
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

const LazyCategoryDonutChart = lazy(() => import('../charts/CategoryDonutChart'))

const share = (amount: number, total: number) => (total ? Math.round((amount / total) * 100) : 0)

/** «هزینه‌ها به تفکیک دسته»: the donut of the period's spending (transfers and corrections left out). */
export function SpendingByCategory({ flow }: { flow: PeriodFlow }) {
  return (
    <CalmBlock title="هزینه‌ها به تفکیک دسته">
      {flow.byCategory.length ? (
        <DeferredMount>
          <Suspense fallback={null}>
            <LazyCategoryDonutChart data={flow.byCategory} tone="expense" />
          </Suspense>
        </DeferredMount>
      ) : (
        <p className={calmEmptyClass}>در این بازه هزینه‌ای ثبت نشده</p>
      )}
    </CalmBlock>
  )
}

/** «جاری در برابر عمرانی»: each expense kind's amount and share of the period's spending. */
export function SpendingByKind({ flow }: { flow: PeriodFlow }) {
  return (
    <CalmBlock title="هزینه به تفکیک نوع">
      {flow.byKind.length ? (
        <ul className={calmListClass}>
          {flow.byKind.map(item => {
            const percent = share(item.amount, flow.expense)

            return (
              <li key={item.value || 'none'} className={calmRowClass}>
                <div className={calmRowMainClass}>
                  <span className={calmRowTitleClass}>{item.label}</span>
                  <span className={calmRowSubClass}>
                    {formatPersianNumber(percent)}٪ از هزینه‌ها
                  </span>
                  <div className={calmBarTrackClass} aria-hidden="true">
                    <div
                      className={calmBarClass}
                      style={{ width: `${percent}%`, background: 'var(--color-primary)' }}
                    />
                  </div>
                </div>
                <span className={calmRowEndClass}>
                  <MoneyText amount={item.amount} />
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={calmEmptyClass}>در این بازه هزینه‌ای ثبت نشده</p>
      )}
    </CalmBlock>
  )
}
