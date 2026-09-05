import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import type { WalletAccountWithRow } from './types'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentHeaderClass,
  installmentPaymentsClass,
  installmentCardClass,
  listCardSubtitleClass,
  listCardTitleClass,
  walletItemAmountPillClass,
  walletItemCardClass,
  walletItemEditClass,
  walletItemInfoClass,
  walletItemNoteClass,
  walletItemTitleRowClass
} from '../ui/featureCardStyles'

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
    <div className={cn(installmentCardClass({ expanded }), walletItemCardClass)}>
      <div className={cardHeaderWithEditClass}>
        <button
          type="button"
          className={cn(
            'installment-header',
            installmentHeaderClass(expanded),
            'wallet-item-header'
          )}
          onClick={onToggleExpand}
        >
          <div className={walletItemInfoClass}>
            <div className={walletItemTitleRowClass}>
              <div className={listCardTitleClass}>{account.title}</div>
              <div className={walletItemAmountPillClass} dir="ltr">
                {formatMoney(displayBalance)}
              </div>
            </div>
            {account.note && (
              <div className={cn(walletItemNoteClass, listCardSubtitleClass)}>{account.note}</div>
            )}
          </div>
        </button>
        <div className={cardActionButtonsClass}>
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
        <div className={cn(installmentPaymentsClass, walletItemEditClass)}>
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
