import { useState } from 'react'

import DangSplitPersonSummaryCard from './DangSplitPersonSummaryCard'
import type { DangSplitPersonWithRow } from './types'
import { useDangSplitPaidEdit } from './useDangSplitPaidEdit'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import { formatMoney } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import { dashboardStatGridClass } from '../ui/chartStyles'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listCardsContainerClass } from '../ui/featureCardStyles'

export default function DangSplitSummaryTab({
  summary,
  people,
  categoryTitleById,
  onSaved
}: {
  summary: DangSplitGroupSummary
  people: DangSplitPersonWithRow[]
  categoryTitleById: Map<string, string>
  onSaved: () => Promise<void> | void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { paidValue, savingId, handleChange, handleBlur } = useDangSplitPaidEdit({
    people,
    summary,
    onSaved
  })

  return (
    <>
      <div className={dashboardStatGridClass}>
        <div className="stat-card">
          <span className="stat-label">جمع کل</span>
          <div className="stat-value">{formatMoney(summary.total)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">پرداخت‌شده</span>
          <div className="stat-value">{formatMoney(summary.paid)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">مانده</span>
          <div className="stat-value">{formatMoney(summary.balance)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">تسویه‌شده</span>
          <div className="stat-value">
            {summary.settledCount.toLocaleString('fa-IR')} از{' '}
            {summary.peopleCount.toLocaleString('fa-IR')}
          </div>
        </div>
      </div>

      {summary.people.length === 0 ? (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="counterparties" />
          </div>
          <p>ابتدا افراد و اقلام هزینه را ثبت کنید</p>
        </div>
      ) : (
        <div className={listCardsContainerClass}>
          {summary.people.map(item => (
            <DangSplitPersonSummaryCard
              key={item.personId}
              item={item}
              categoryTitle={categoryTitleById.get(item.categoryId) ?? ''}
              expanded={expandedId === item.personId}
              paidValue={paidValue(item.personId)}
              saving={savingId === item.personId}
              onExpand={setExpandedId}
              onPaidChange={value => handleChange(item.personId, value)}
              onPaidBlur={() => void handleBlur(item.personId)}
            />
          ))}
        </div>
      )}
    </>
  )
}
