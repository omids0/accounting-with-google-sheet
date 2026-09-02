import type { TransactionWithRow } from './types'
import { formatQuantity } from './utils'
import { getAssetUnit } from '../../services/tgju'
import type { VaultTransaction } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'

type TreasuryTransactionItemProps = {
  tx: VaultTransaction
  onEdit: (tx: TransactionWithRow) => void
  onDelete: (tx: TransactionWithRow) => void
}

export default function TreasuryTransactionItem({
  tx,
  onEdit,
  onDelete
}: TreasuryTransactionItemProps) {
  const txWithRow = tx as TransactionWithRow

  return (
    <div className="treasury-tx-item interactive-card">
      {tx.action === 'buy' && 'rowNumber' in tx && (
        <div className="treasury-tx-edit">
          <div className="card-action-buttons">
            <CardEditButton onClick={() => onEdit(txWithRow)} />
            <CardDeleteButton onClick={() => onDelete(txWithRow)} />
          </div>
        </div>
      )}
      <div className="treasury-tx-main">
        <span className={`treasury-tx-badge ${tx.action === 'buy' ? 'buy' : 'sell'}`}>
          {tx.action === 'buy' ? 'خرید' : 'فروش'}
        </span>
        <span>{formatQuantity(tx.quantity, tx.assetType)}</span>
      </div>
      <div className="treasury-tx-details">
        <span dir="ltr">
          {formatMoney(tx.unitPrice)} / {getAssetUnit(tx.assetType)}
        </span>
        <span className="installment-due">{formatIsoDatePersian(tx.transactionDate)}</span>
        {tx.note && <span className="installment-due">{tx.note}</span>}
      </div>
    </div>
  )
}
