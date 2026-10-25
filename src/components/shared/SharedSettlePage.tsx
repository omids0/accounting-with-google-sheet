import SharedViewerBanner from './SharedViewerBanner'
import { balanceHeadline, SETTLE_PERMISSION_NOTE } from './sharedViewModel'
import { useSharedRecords } from './useSharedRecords'
import { useSharedSheets } from './useSharedSheets'
import { isConfigured } from '../../services/settings'
import { suggestSettlement } from '../../services/sharedSettlement'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import EmptyState from '../EmptyState'
import MoneyText from '../MoneyText'
import { RecordListSkeleton } from '../skeleton'
import TransactionListItem from '../TransactionListItem'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  sharedAmountClass,
  sharedCardTitleClass,
  sharedListClass,
  sharedMutedClass,
  sharedPageClass
} from '../ui/sharedStyles'

/**
 * «تسویه» of the shared account: the current state (who owes whom how much) with «ثبت تسویه» for
 * whoever holds `settle`, and the settlements so far, newest first; a tap opens one (to fix it).
 */
export default function SharedSettlePage() {
  const shared = useSharedRecords()
  const sheets = useSharedSheets(shared, { withAdd: false })

  if (!isConfigured()) return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />

  if (shared.loading && !shared.entries.length) return <RecordListSkeleton />

  const owed = shared.balance ? suggestSettlement(shared.balance.net) : null

  return (
    <div className={sharedPageClass}>
      {shared.role === 'viewer' ? <SharedViewerBanner /> : null}

      <Card>
        <h3 className={sharedCardTitleClass}>وضع فعلی</h3>
        {shared.pair && shared.balance ? (
          <>
            {owed ? (
              <p className="numeric m-0 mt-2 text-[1.3rem] font-extrabold text-text">
                <MoneyText amount={owed.amount} />
              </p>
            ) : null}
            <p className="m-0 mt-1 font-semibold text-text">
              {balanceHeadline(shared.balance.net, shared.me, shared.names)}
            </p>
            {shared.balance.skipped > 0 ? (
              <p className={sharedMutedClass}>
                {`${toPersianDigits(String(shared.balance.skipped))} ثبت نامعتبر نادیده گرفته شد`}
              </p>
            ) : null}
            {sheets.openSettle ? (
              <Button
                type="button"
                className="mt-3 min-h-11 w-full"
                disabled={!owed}
                onClick={sheets.openSettle}
              >
                ثبت تسویه
              </Button>
            ) : (
              <p className={sharedMutedClass}>{SETTLE_PERMISSION_NOTE}</p>
            )}
          </>
        ) : (
          <p className={sharedMutedClass}>هنوز شریکی به این حساب نپیوسته است.</p>
        )}
      </Card>

      <Card>
        <h3 className={sharedCardTitleClass}>تسویه‌های قبلی</h3>
        {shared.settlements.length ? (
          <div className={sharedListClass}>
            {shared.settlements.map(({ record, settlement }, index) => {
              const title = `${shared.nameOf(settlement.from)} به ${shared.nameOf(settlement.to)}`

              return (
                <TransactionListItem
                  key={record.id}
                  title={title}
                  meta={record.values.date ? formatIsoDatePersian(record.values.date) : ''}
                  index={index}
                  onOpen={() => sheets.openRecord(record)}
                  openLabel={`جزئیات تسویهٔ ${title}`}
                >
                  <b className={sharedAmountClass}>
                    <MoneyText amount={settlement.amount} />
                  </b>
                </TransactionListItem>
              )
            })}
          </div>
        ) : (
          <p className={sharedMutedClass}>هنوز تسویه‌ای نشده.</p>
        )}
      </Card>

      {sheets.overlays}
    </div>
  )
}
