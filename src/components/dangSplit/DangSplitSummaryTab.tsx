import { useMemo, useState } from 'react'

import DangSplitPersonSummaryCard from './DangSplitPersonSummaryCard'
import {
  dangSplitBalanceValueClass,
  dangSplitCountBadgeClass,
  dangSplitGroupClass,
  dangSplitGroupHeaderClass,
  dangSplitGroupHeaderTitleClass,
  dangSplitSectionHeadRowClass
} from './dangSplitStyles'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import { useDangSplitPayments } from './useDangSplitPayments'
import type { DangSplitGroupSummary, DangSplitPersonSummary } from '../../types/dangSplit'
import { formatMoney } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import ProgressBar from '../ProgressBar'
import StatCard from '../StatCard'
import { dashboardStatGridClass } from '../ui/chartStyles'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listCardsContainerClass } from '../ui/featureCardStyles'

type SummarySection = {
  key: string
  title: string
  people: DangSplitPersonSummary[]
  balance: number
}

function sectionTone(balance: number) {
  if (balance === 0) return 'settled' as const

  return balance < 0 ? ('credit' as const) : ('debt' as const)
}

function sectionLabel(balance: number): string {
  if (balance === 0) return 'مانده'

  return balance < 0 ? 'طلبکار' : 'بدهکار'
}

export default function DangSplitSummaryTab({
  summary,
  people,
  categories,
  onSaved
}: {
  summary: DangSplitGroupSummary
  people: DangSplitPersonWithRow[]
  categories: DangSplitCategoryWithRow[]
  onSaved: () => Promise<void> | void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const payments = useDangSplitPayments({ people, summary, onSaved })

  const sections = useMemo<SummarySection[]>(() => {
    const grouped: SummarySection[] = categories
      .map(category => {
        const members = summary.people.filter(item => item.categoryId === category.id)

        return {
          key: category.id,
          title: category.title,
          people: members,
          balance: members.reduce((sum, item) => sum + item.balance, 0)
        }
      })
      .filter(section => section.people.length > 0)
    const loose = summary.people.filter(
      item => !item.categoryId || !categories.some(category => category.id === item.categoryId)
    )

    if (loose.length > 0) {
      // افراد بی‌دسته عنوان نمی‌گیرند و ته لیست می‌آیند.
      grouped.push({
        key: 'none',
        title: '',
        people: loose,
        balance: loose.reduce((sum, item) => sum + item.balance, 0)
      })
    }

    return grouped
  }, [categories, summary.people])

  const settledRatio =
    summary.peopleCount > 0 ? (summary.settledCount / summary.peopleCount) * 100 : 0

  return (
    <>
      <div className={dashboardStatGridClass}>
        <StatCard label="جمع کل" amount={summary.total} variant="balance" animateIndex={0} lift />
        <StatCard
          label="بستانکاری افراد (واریز + پرداختی)"
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
        sections.map(section => (
          <div key={section.key} className={dangSplitGroupClass}>
            {section.title ? (
              <div className={dangSplitGroupHeaderClass}>
                <span className={dangSplitSectionHeadRowClass}>
                  <span className={dangSplitGroupHeaderTitleClass}>{section.title}</span>
                  <span className={dangSplitCountBadgeClass}>
                    {section.people.length.toLocaleString('fa-IR')} نفر
                  </span>
                </span>
                <span className={dangSplitBalanceValueClass(sectionTone(section.balance))}>
                  {sectionLabel(section.balance)}: {formatMoney(Math.abs(section.balance))}
                </span>
              </div>
            ) : null}

            <div className={listCardsContainerClass}>
              {section.people.map((item, index) => (
                <DangSplitPersonSummaryCard
                  key={item.personId}
                  item={item}
                  index={index}
                  categoryTitle=""
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
          </div>
        ))
      )}
    </>
  )
}
