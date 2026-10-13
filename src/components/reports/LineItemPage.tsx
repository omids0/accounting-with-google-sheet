import { useNavigate } from 'react-router'

import LineItemMonthBars from './lineItems/LineItemMonthBars'
import { useLineItemPage } from './lineItems/useLineItemPage'
import { recordFocusPath } from '../../routes/paths'
import type { LineItemsReportType } from '../../services/lineItemsReport'
import { useNavigationStore } from '../../stores/navigationStore'
import { cn } from '../../utils/cn'
import { formatMoney, formatPersianNumber } from '../../utils/formatMoney'
import { isoToJalali, JALALI_MONTHS } from '../../utils/jalaliDate'
import EmptyState from '../EmptyState'
import MoneyText from '../MoneyText'
import { InstallmentCardListSkeleton } from '../skeleton'
import {
  calmBlockClass,
  calmBlockHeadClass,
  calmBlockTitleClass,
  calmDayBadgeClass,
  calmDayBadgeMonthClass,
  calmListClass,
  calmRowButtonClass,
  calmRowClass,
  calmRowEndClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'
import Card from '../ui/Card'
import { dashboardPageClass } from '../ui/chartStyles'
import { reportPageClass } from '../ui/toolsPageStyles'

/** Records shown on the item page before the list is cut. */
const MAX_RECORDS = 50

function DateBadge({ iso }: { iso: string }) {
  if (!iso) return null

  const { day, month } = isoToJalali(iso)

  return (
    <span className={calmDayBadgeClass} aria-hidden="true">
      {formatPersianNumber(day, { useGrouping: false })}
      <span className={calmDayBadgeMonthClass}>{JALALI_MONTHS[month - 1]}</span>
    </span>
  )
}

/** One item over the last 12 months: its monthly totals, the records that carry it, look-alikes. */
export default function LineItemPage({
  itemKey,
  type
}: {
  itemKey: string
  type: LineItemsReportType
}) {
  const navigate = useNavigate()

  const page = useLineItemPage(itemKey, type)

  const tone = type === 'income' ? 'income' : 'expense'

  const openItem = (key: string, name: string) =>
    useNavigationStore.getState().onTabChange('report-line-item', {
      lineItemKey: key,
      lineItemTitle: name,
      lineItemType: type
    })

  if (!page.loaded) return <InstallmentCardListSkeleton count={3} />

  if (!page.occurrences.length) {
    return (
      <EmptyState
        icon="records"
        message="این قلم در هیچ رکوردی نیست"
        action={{
          label: 'گزارش اقلام',
          onClick: () => useNavigationStore.getState().onTabChange('report-line-items')
        }}
      />
    )
  }

  const shown = page.occurrences.slice(0, MAX_RECORDS)

  return (
    <div
      className={cn(dashboardPageClass, reportPageClass, 'xl:grid xl:grid-cols-2 xl:items-start')}
    >
      <Card>
        <h2 className={calmBlockTitleClass}>{`${page.name} · ۱۲ ماه اخیر`}</h2>
        <p className="m-0 mt-1 text-[1.35rem] font-bold">
          <MoneyText amount={page.total} />
        </p>
        <p className="m-0 mb-3 mt-1 text-[0.78rem] text-muted">
          {`${formatPersianNumber(page.count)} بار · ماهی ~${formatMoney(page.perMonth)}`}
          {page.topCounterparty ? ` · بیشتر از ${page.topCounterparty}` : ''}
        </p>
        <LineItemMonthBars history={page.history} tone={tone} />
      </Card>

      <div className={cn(reportPageClass)}>
        <section className={calmBlockClass} aria-label="رکوردهایی که این قلم را دارند">
          <div className={calmBlockHeadClass}>
            <h3 className={calmBlockTitleClass}>رکوردهایی که این قلم را دارند</h3>
          </div>
          <ul className={calmListClass}>
            {shown.map(occurrence => (
              <li key={occurrence.id} className={calmRowClass}>
                <DateBadge iso={occurrence.date} />
                <button
                  type="button"
                  className={calmRowButtonClass}
                  onClick={() => navigate(recordFocusPath(occurrence.type, occurrence.id))}
                >
                  <span className={calmRowTitleClass}>{occurrence.title || 'بدون عنوان'}</span>
                  <span className={calmRowSubClass}>
                    {[
                      occurrence.quantity,
                      `${formatPersianNumber(occurrence.amount)} از ${formatPersianNumber(
                        occurrence.recordAmount
                      )}`,
                      occurrence.counterparty
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
                <span className={calmRowEndClass}>
                  <MoneyText amount={occurrence.amount} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        {page.similar.length ? (
          <section className={calmBlockClass} aria-label="نام‌های مشابه">
            <div className={calmBlockHeadClass}>
              <h3 className={calmBlockTitleClass}>نام‌های مشابه</h3>
            </div>
            <ul className={calmListClass}>
              {page.similar.map(entry => (
                <li key={entry.key} className={calmRowClass}>
                  <button
                    type="button"
                    className={calmRowButtonClass}
                    onClick={() => openItem(entry.key, entry.name)}
                  >
                    <span className={calmRowTitleClass}>{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
