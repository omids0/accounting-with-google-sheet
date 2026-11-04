import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import ChildMonthBar from './ChildMonthBar'
import ChildPageFrame from './ChildPageFrame'
import ChildRecordDetail from './ChildRecordDetail'
import ChildRecordRow from './ChildRecordRow'
import ChildUndatedNote from './ChildUndatedNote'
import {
  categoryBreakdown,
  inMonth,
  monthSummary,
  netDirection,
  type ChildEntry
} from './childViewModel'
import ChildWalletCard from './ChildWalletCard'
import { useChildMonth } from './useChildMonth'
import { useChildRecords } from './useChildRecords'
import { childRecordsPath } from '../../routes/childPaths'
import { getPathForTab } from '../../routes/paths'
import { isConfigured } from '../../services/settings'
import CalmBlock from '../CalmBlock'
import CategoryShareList from '../charts/CategoryShareList'
import EmptyState from '../EmptyState'
import LoadErrorState from '../LoadErrorState'
import { DashboardSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import Card from '../ui/Card'
import { statGridClass } from '../ui/chartStyles'

/** Like the personal dashboard's «تحلیل این ماه»; the categories page lists them all. */
const TOP_CATEGORIES = 3

const LATEST = 5

/**
 * «خلاصه» of a child's account (a parent's read-only view): the month's income, spending and
 * net (income minus expense, not a balance: the wallet card holds that) with the month stepper, the biggest spending categories, the latest records and the
 * wallet. Every number is computed from the child's records on this device (`childViewModel`).
 */
export default function ChildHomePage() {
  const { entries, forms, loading, loadFailed, reload } = useChildRecords()
  const month = useChildMonth()
  const navigate = useNavigate()
  const [opened, setOpened] = useState<ChildEntry | null>(null)

  const summary = useMemo(() => monthSummary(entries, month.month), [entries, month.month])

  const top = useMemo(
    () => categoryBreakdown(entries, month.month, 'expense').slice(0, TOP_CATEGORIES),
    [entries, month.month]
  )

  const latest = useMemo(
    () => entries.filter(entry => inMonth(entry, month.month)).slice(0, LATEST),
    [entries, month.month]
  )

  if (!isConfigured()) return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />

  return (
    <ChildPageFrame>
      {loading && !entries.length ? (
        <DashboardSkeleton />
      ) : loadFailed && !entries.length ? (
        <LoadErrorState onRetry={reload} />
      ) : (
        <>
          <ChildMonthBar month={month} />

          <div className={statGridClass}>
            <StatCard label="درآمد" amount={summary.income} variant="income" />
            <StatCard label="هزینه" amount={summary.expense} variant="expense" />
            <StatCard
              label="خالص این ماه"
              amount={summary.balance}
              variant="flow"
              flowDirection={netDirection(summary.balance)}
            />
          </div>

          {entries.length === 0 ? (
            <EmptyState
              icon="empty-inbox"
              message="هنوز تراکنشی ثبت نشده"
              description="هر درآمد یا هزینه‌ای که فرزندتان ثبت کند، همین‌جا دیده می‌شود."
            />
          ) : (
            <>
              <Card>
                <CalmBlock
                  title="بیشترین هزینه‌ها"
                  icon="chart"
                  action={{
                    label: 'همهٔ دسته‌ها ←',
                    onClick: () => navigate(getPathForTab('child-categories')),
                    touch: true
                  }}
                >
                  {top.length ? (
                    <CategoryShareList
                      items={top}
                      tone="expense"
                      shareChip
                      onOpen={category =>
                        navigate(
                          childRecordsPath(category, { month: month.month, kind: 'expense' })
                        )
                      }
                    />
                  ) : (
                    <p className="m-0 py-2 text-[0.8rem] text-muted">در این ماه هزینه‌ای نیست.</p>
                  )}
                </CalmBlock>
              </Card>

              <Card>
                <CalmBlock
                  title="آخرین تراکنش‌ها"
                  icon="records"
                  action={{
                    label: 'همه ←',
                    onClick: () => navigate(getPathForTab('child-records')),
                    touch: true
                  }}
                >
                  {latest.length ? (
                    latest.map((entry, index) => (
                      <ChildRecordRow
                        key={entry.id}
                        entry={entry}
                        index={index}
                        onOpen={setOpened}
                      />
                    ))
                  ) : (
                    <p className="m-0 py-2 text-[0.8rem] text-muted">در این ماه تراکنشی نیست.</p>
                  )}
                </CalmBlock>
              </Card>
            </>
          )}

          <ChildUndatedNote entries={entries} />
          <ChildWalletCard />
          <ChildRecordDetail entry={opened} forms={forms} onClose={() => setOpened(null)} />
        </>
      )}
    </ChildPageFrame>
  )
}
