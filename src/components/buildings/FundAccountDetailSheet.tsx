import FundLedgerList from './FundLedgerList'
import { fundAccountMeta } from './fundRows'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import FormModal from '../FormModal'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import { calmBlockTitleClass } from '../ui/calmListStyles'
import type { WalletAccountWithRow } from '../wallet/types'
import { useWalletLedger } from '../wallet/useWalletLedger'

const RECENT_LINES = 5

function AccountHistory({ accountId }: { accountId: string }) {
  const { entries, loading } = useWalletLedger(accountId)

  return loading ? null : <FundLedgerList entries={entries.slice(0, RECENT_LINES)} />
}

interface FundAccountDetailSheetProps {
  /** The tapped account; null = closed. */
  account: WalletAccountWithRow | null
  onReconcile: (account: WalletAccountWithRow) => void
  onEdit: (account: WalletAccountWithRow) => void
  onClose: () => void
}

/**
 * An account of the fund: its balance, the way to bring it in line with the bank («تطبیق موجودی
 * با بانک», `record`), «ویرایش حساب» (name and card, `settings`) and its last records.
 */
export default function FundAccountDetailSheet({
  account,
  onReconcile,
  onEdit,
  onClose
}: FundAccountDetailSheetProps) {
  const { can } = useBuildingAccess()

  return (
    <FormModal
      open={account !== null}
      title={account?.title ?? ''}
      saveLabel="بستن"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onClose()
      }}
    >
      {account ? (
        <>
          <div>
            <span className="block text-[0.78rem] text-muted">موجودی فعلی در اپ</span>
            <b className="text-[1.4rem]">
              <MoneyText amount={account.balance} />
            </b>
            <span className="block text-[0.78rem] text-muted">{fundAccountMeta(account)}</span>
          </div>
          {can('record') || can('settings') ? (
            <div className="flex flex-wrap gap-2">
              {can('record') ? (
                <Button type="button" onClick={() => onReconcile(account)}>
                  تطبیق موجودی با بانک
                </Button>
              ) : null}
              {can('settings') ? (
                <Button type="button" variant="secondary" onClick={() => onEdit(account)}>
                  ویرایش حساب
                </Button>
              ) : null}
            </div>
          ) : null}
          <h3 className={calmBlockTitleClass}>آخرین رکوردهای این حساب</h3>
          <AccountHistory accountId={account.id} />
        </>
      ) : null}
    </FormModal>
  )
}
