import { useState } from 'react'

import DangSplitPersonSummaryCard from './DangSplitPersonSummaryCard'
import type { DangSplitPersonWithRow } from './types'
import { useDangSplitPayments } from './useDangSplitPayments'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import AppIcon from '../AppIcon'
import ProgressBar from '../ProgressBar'
import StatCard from '../StatCard'
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
  const payments = useDangSplitPayments({ people, summary, onSaved })

  const settledRatio =
    summary.peopleCount > 0 ? (summary.settledCount / summary.peopleCount) * 100 : 0

  return (
    <>
      <div className={dashboardStatGridClass}>
        <StatCard label="جمع کل" amount={summary.total} variant="balance" animateIndex={0} lift />
        <StatCard
          label="پرداخت‌شده توسط افراد"
          amount={summary.covered}
          variant="income"
          animateIndex={1}
          lift
        />
        <StatCard
          label="مانده بدهکاران"
          amount={summary.debtTotal}
          variant="expense"
          animateIndex={2}
          lift
        />
        <StatCard
          label={`طلبکاران (${summary.settledCount.toLocaleString(
            'fa-IR'
          )} از ${summary.peopleCount.toLocaleString('fa-IR')} تسویه)`}
          amount={summary.creditTotal}
          variant="default"
          animateIndex={3}
          lift
          footer={
            <ProgressBar
              value={settledRatio}
              variant={settledRatio >= 100 ? 'complete' : 'default'}
              aria-label="درصد افراد تسویه‌شده"
            />
          }
        />
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
          {summary.people.map((item, index) => (
            <DangSplitPersonSummaryCard
              key={item.personId}
              item={item}
              index={index}
              categoryTitle={categoryTitleById.get(item.categoryId) ?? ''}
              expanded={expandedId === item.personId}
              saving={payments.savingId === item.personId}
              showPaymentForm={payments.paymentPersonId === item.personId}
              onToggleExpand={() =>
                setExpandedId(expandedId === item.personId ? null : item.personId)
              }
              onOpenPaymentForm={() => payments.openPaymentForm(item.personId)}
              onClosePaymentForm={payments.closePaymentForm}
              onAddPayment={amount => void payments.addPayment(item.personId, amount)}
              onSettleFull={() => void payments.settleFull(item.personId)}
              onUndoPayments={() => void payments.undoPayments(item.personId)}
            />
          ))}
        </div>
      )}
    </>
  )
}
