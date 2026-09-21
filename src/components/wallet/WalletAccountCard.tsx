import { cn } from '../../utils/cn'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import type { WalletAccountWithRow } from './types'
import WalletAccountCardVisual from './WalletAccountCardVisual'
import {
  walletAccountCardBodyClass,
  walletAccountCardShellClass,
  walletAccountCardVisualHostClass,
  walletCardActionOverlayClass,
  walletCardActionOverlayExpandedClass
} from './walletCardStyles'
import { installmentPaymentsClass, walletItemEditClass } from '../ui/featureCardStyles'

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
      className={cn(
        walletAccountCardShellClass,
        expanded &&
          'rounded-[12px] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]'
      )}
    >
      <div className={walletAccountCardVisualHostClass}>
        <div
          role="button"
          tabIndex={0}
          className={walletAccountCardBodyClass}
          onClick={onToggleExpand}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onToggleExpand()
            }
          }}
          aria-label={expanded ? 'بستن جزئیات حساب' : 'نمایش جزئیات حساب'}
        >
          <WalletAccountCardVisual account={account} displayBalance={displayBalance} />
        </div>

        <div
          className={cn(
            walletCardActionOverlayClass,
            expanded && walletCardActionOverlayExpandedClass
          )}
        >
          <CardEditButton onClick={() => onEdit()} />
          <CardDeleteButton onClick={() => onDelete()} />
          <CardExpandButton
            expanded={expanded}
            className={expanded ? 'card-action-btn--expanded' : undefined}
            onClick={() => onToggleExpand()}
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
