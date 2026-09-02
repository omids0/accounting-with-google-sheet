import TreasurySellForm, { createEmptySellForm } from './TreasurySellForm'
import TreasuryTransactionItem from './TreasuryTransactionItem'
import type { TransactionWithRow, VaultFormState } from './types'
import { formatQuantity } from './utils'
import { getAssetLabel } from '../../services/tgju'
import type { VaultAssetType, VaultHolding } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'

type TreasuryHoldingCardProps = {
  holding: VaultHolding
  expanded: boolean
  sellForm: VaultFormState | null
  sellingAsset: VaultAssetType | null
  onToggle: () => void
  onEdit: (tx: TransactionWithRow) => void
  onDelete: (tx: TransactionWithRow) => void
  onSellFormChange: (updater: (prev: VaultFormState) => VaultFormState) => void
  onOpenSellForm: (form: VaultFormState) => void
  onCloseSellForm: () => void
  onSell: (assetType: VaultAssetType, available: number) => void
}

export default function TreasuryHoldingCard({
  holding,
  expanded,
  sellForm,
  sellingAsset,
  onToggle,
  onEdit,
  onDelete,
  onSellFormChange,
  onOpenSellForm,
  onCloseSellForm,
  onSell
}: TreasuryHoldingCardProps) {
  const showSellForm = sellForm?.assetType === holding.assetType

  return (
    <div
      className={`card installment-card interactive-card treasury-holding-card${
        expanded ? ' installment-card--expanded' : ''
      }`}
    >
      <button
        type="button"
        className={`installment-header${expanded ? ' installment-header--expanded' : ''}`}
        onClick={onToggle}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {getAssetLabel(holding.assetType)}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem'
            }}
          >
            {formatQuantity(holding.netQuantity, holding.assetType)}
            {' · '}
            قیمت روز: {formatMoney(holding.currentUnitPrice)}
          </div>
          <div className="treasury-holding-value">ارزش کل: {formatMoney(holding.totalValue)}</div>
        </div>
        <span className="installment-chevron">▼</span>
      </button>

      <AccordionCollapse open={expanded}>
        <div className="installment-payments">
          <div className="receivable-payment-list-title">سوابق خرید و فروش</div>
          {holding.transactions.map(tx => (
            <TreasuryTransactionItem key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
          ))}

          <div className="receivable-add-payment">
            {showSellForm && sellForm ? (
              <TreasurySellForm
                assetType={holding.assetType}
                sellForm={sellForm}
                selling={sellingAsset === holding.assetType}
                onSellFormChange={onSellFormChange}
                onSell={() => onSell(holding.assetType, holding.netQuantity)}
                onCancel={onCloseSellForm}
              />
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenSellForm(createEmptySellForm(holding.assetType))}
              >
                + ثبت فروش
              </button>
            )}
          </div>
        </div>
      </AccordionCollapse>
    </div>
  )
}
