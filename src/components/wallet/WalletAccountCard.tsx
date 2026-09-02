import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import type { WalletAccountWithRow } from './types'

type WalletAccountCardProps = {
  account: WalletAccountWithRow
  expanded: boolean
  balance: number | ''
  saving: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onBalanceChange: (value: number | '') => void
  onBalanceSave: () => void
  onClose: () => void
}

export default function WalletAccountCard({
  account,
  expanded,
  balance,
  saving,
  onToggleExpand,
  onEdit,
  onDelete,
  onBalanceChange,
  onBalanceSave,
  onClose
}: WalletAccountCardProps) {
  const displayBalance = balance === '' ? account.balance : Number(balance)

  return (
    <div
      className={`card installment-card interactive-card wallet-item-card${
        expanded ? ' installment-card--expanded' : ''
      }`}
    >
      <div className="card-header-with-edit">
        <button
          type="button"
          className={`installment-header wallet-item-header${
            expanded ? ' installment-header--expanded' : ''
          }`}
          onClick={onToggleExpand}
        >
          <div className="wallet-item-info">
            <div className="wallet-item-title-row">
              <div className="list-card-title">{account.title}</div>
              <div className="wallet-item-amount list-card-amount-pill" dir="ltr">
                {formatMoney(displayBalance)}
              </div>
            </div>
            {account.note && (
              <div className="wallet-item-note list-card-subtitle">{account.note}</div>
            )}
          </div>
        </button>
        <div className="card-action-buttons">
          <CardEditButton
            onClick={event => {
              event.stopPropagation()
              onEdit()
            }}
          />
          <CardDeleteButton
            onClick={event => {
              event.stopPropagation()
              onDelete()
            }}
          />
          <CardExpandButton
            expanded={expanded}
            onClick={event => {
              event.stopPropagation()
              onToggleExpand()
            }}
            ariaLabel={expanded ? 'بستن جزئیات' : 'نمایش جزئیات حساب'}
          />
        </div>
      </div>

      <AccordionCollapse open={expanded}>
        <div className="installment-payments wallet-item-edit">
          <CardInlineAmountEdit
            label="موجودی"
            value={balance}
            onChange={onBalanceChange}
            onBlur={onBalanceSave}
            onClose={onClose}
            saving={saving}
          />
        </div>
      </AccordionCollapse>
    </div>
  )
}
