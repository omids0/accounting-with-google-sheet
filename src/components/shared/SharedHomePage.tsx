import { useNavigate } from 'react-router'

import SharedBalanceCard from './SharedBalanceCard'
import SharedMonthCard from './SharedMonthCard'
import SharedNoticeSlot from './SharedNoticeSlot'
import SharedRecordRow from './SharedRecordRow'
import SharedViewerBanner from './SharedViewerBanner'
import { balanceHeadline, monthTotals } from './sharedViewModel'
import { useSharedRecords } from './useSharedRecords'
import { useSharedSheets } from './useSharedSheets'
import { getPathForTab } from '../../routes/paths'
import { monthKeyOfIso, monthName } from '../../services/buildingMonths'
import { isConfigured } from '../../services/settings'
import { suggestSettlement } from '../../services/sharedSettlement'
import { getTodayIso } from '../../utils/jalaliDate'
import EmptyState from '../EmptyState'
import { DashboardSkeleton } from '../skeleton'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  sharedCardHeadClass,
  sharedCardTitleClass,
  sharedListClass,
  sharedMutedClass,
  sharedPageClass
} from '../ui/sharedStyles'

/**
 * «خانه» of the shared account: the balance to date (who owes whom, «ثبت تسویه»), the month's
 * spending with a bar of who paid it, and the three latest records. The header holds the title.
 */
export default function SharedHomePage() {
  const shared = useSharedRecords()
  const sheets = useSharedSheets(shared)
  const navigate = useNavigate()

  if (!isConfigured()) return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />

  if (shared.loading && !shared.entries.length) return <DashboardSkeleton />

  const month = monthKeyOfIso(getTodayIso())
  const totals = monthTotals(shared.rows, month)
  const owed = shared.balance ? suggestSettlement(shared.balance.net) : null

  return (
    <div className={sharedPageClass}>
      {shared.role === 'viewer' ? <SharedViewerBanner /> : null}
      <SharedNoticeSlot />

      {shared.pair && shared.balance ? (
        <SharedBalanceCard
          headline={balanceHeadline(shared.balance.net, shared.me, shared.names)}
          amount={owed?.amount ?? 0}
          skipped={shared.balance.skipped}
          onSettle={sheets.openSettle}
        />
      ) : (
        <Card>
          <p className={sharedMutedClass}>
            هنوز شریکی به این حساب نپیوسته است؛ تراز بعد از پیوستن شریک حساب می‌شود.
          </p>
        </Card>
      )}

      {shared.pair ? (
        <SharedMonthCard
          monthName={monthName(month)}
          total={totals.total}
          paid={totals.paid}
          people={shared.pair}
          nameOf={shared.nameOf}
        />
      ) : null}

      <Card>
        <div className={sharedCardHeadClass}>
          <h3 className={sharedCardTitleClass}>آخرین ثبت‌ها</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11"
            onClick={() => navigate(getPathForTab('shared-records'))}
          >
            همه
          </Button>
        </div>
        {shared.entries.length ? (
          <div className={sharedListClass}>
            {shared.entries.slice(0, 3).map((record, index) => (
              <SharedRecordRow
                key={record.id}
                record={record}
                shared={shared}
                index={index}
                onOpen={sheets.openRecord}
              />
            ))}
          </div>
        ) : (
          <p className={sharedMutedClass}>هنوز ثبتی نیست.</p>
        )}
      </Card>

      {sheets.overlays}
    </div>
  )
}
