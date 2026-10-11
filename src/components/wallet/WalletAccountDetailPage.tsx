import type { WalletAccountWithRow } from './types'
import { useWalletLedger } from './useWalletLedger'
import WalletAccountCardVisual from './WalletAccountCardVisual'
import WalletLedgerItem from './WalletLedgerItem'
import EmptyState from '../EmptyState'
import { RecordListSkeleton } from '../skeleton'
import Card from '../ui/Card'
import { listModulePageClass } from '../ui/featureCardStyles'
import { recordsListCountClass, recordsListHeaderClass } from '../ui/recordsStyles'

/** One account's balance history («گردش حساب»), opened by tapping its wallet card. */
export default function WalletAccountDetailPage({ account }: { account: WalletAccountWithRow }) {
  const { entries, loading } = useWalletLedger(account.id)

  return (
    <div className={listModulePageClass}>
      <WalletAccountCardVisual account={account} displayBalance={account.balance} />

      {loading ? (
        <RecordListSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState icon="wallet" message="هنوز گردشی ثبت نشده" />
      ) : (
        <Card className="records-list-card">
          <div className={recordsListHeaderClass}>
            <span>گردش حساب</span>
            <span className={recordsListCountClass}>{entries.length} ردیف</span>
          </div>
          {entries.map((entry, index) => (
            <WalletLedgerItem key={entry.id} entry={entry} index={index} />
          ))}
        </Card>
      )}
    </div>
  )
}
