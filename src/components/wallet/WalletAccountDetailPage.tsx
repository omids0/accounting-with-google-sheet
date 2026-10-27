import TransferFormModal from './transfers/TransferFormModal'
import type { WalletAccountWithRow } from './types'
import { useWalletLedger } from './useWalletLedger'
import { useWalletLedgerSpeedDial } from './useWalletLedgerSpeedDial'
import WalletAccountCardVisual from './WalletAccountCardVisual'
import WalletLedgerItem from './WalletLedgerItem'
import { useIncrementalList } from '../../hooks/useIncrementalList'
import { listCountLabel } from '../../utils/listCountLabel'
import ConfirmActionModal from '../ConfirmActionModal'
import EmptyState from '../EmptyState'
import ShowMoreFooter from '../ShowMoreFooter'
import { RecordListSkeleton } from '../skeleton'
import Card from '../ui/Card'
import { listModulePageClass } from '../ui/featureCardStyles'
import { recordsListCountClass, recordsListHeaderClass } from '../ui/recordsStyles'

/** One account's balance history («گردش حساب»), opened by tapping its wallet card. */
export default function WalletAccountDetailPage({ account }: { account: WalletAccountWithRow }) {
  const { entries, loading, reload } = useWalletLedger(account.id)
  // Long histories (thousands of rows) show 50 at a time; the speed dial and balances keep all rows.
  const { visible, remaining, nextStep, showMore } = useIncrementalList(entries)
  const { confirmModal, openEntry, transferModalProps } = useWalletLedgerSpeedDial({
    account,
    entries,
    loading,
    reload
  })

  return (
    <div className={listModulePageClass}>
      <WalletAccountCardVisual account={account} displayBalance={account.balance} />

      {loading && entries.length === 0 ? (
        <RecordListSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="wallet"
          description="هر تغییر موجودی این حساب، از ثبت هزینه و درآمد تا اصلاح دستی، این‌جا ثبت می‌شود."
          message="هنوز گردشی ثبت نشده"
          action={{ label: 'ثبت هزینه', onClick: () => openEntry('expense') }}
        />
      ) : (
        <Card className="records-list-card">
          <div className={recordsListHeaderClass}>
            <span>گردش حساب</span>
            <span className={recordsListCountClass}>
              {listCountLabel(visible.length, entries.length, 'ردیف')}
            </span>
          </div>
          {visible.map((entry, index) => (
            <WalletLedgerItem key={entry.id} entry={entry} index={index} />
          ))}
          <ShowMoreFooter
            remaining={remaining}
            nextStep={nextStep}
            onShowMore={showMore}
            unit="ردیف"
          />
        </Card>
      )}

      <TransferFormModal {...transferModalProps} />
      <ConfirmActionModal {...confirmModal} />
    </div>
  )
}
