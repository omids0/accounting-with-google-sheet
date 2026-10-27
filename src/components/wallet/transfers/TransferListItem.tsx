import { describeTransfer, type Transfer } from '../../../services/transfers'
import type { WalletAccount } from '../../../types'
import CardDeleteButton from '../../CardDeleteButton'
import TransactionListItem from '../../TransactionListItem'

/** One transfer in «انتقال‌ها»: «انتقال از «A» به «B»», then amount · date · note, and delete. */
export default function TransferListItem({
  transfer,
  accounts,
  index,
  deleting,
  onDelete
}: {
  transfer: Transfer
  accounts: WalletAccount[]
  index: number
  deleting: boolean
  onDelete: (transfer: Transfer) => void
}) {
  const { title, subtitle } = describeTransfer(transfer, accounts)

  return (
    <TransactionListItem title={title} meta={subtitle} index={index} wrapTitle>
      <CardDeleteButton itemLabel={title} disabled={deleting} onClick={() => onDelete(transfer)} />
    </TransactionListItem>
  )
}
