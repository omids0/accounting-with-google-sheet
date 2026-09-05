import type { WalletPeriodFlow } from '../../services/wallet'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import AmountInput from '../AmountInput'
import Button from '../ui/Button'
import {
  dashboardOpeningBodyClass,
  dashboardOpeningCardClass,
  dashboardOpeningFormClass,
  dashboardOpeningHintClass,
  dashboardOpeningInputWrapClass,
  walletOpeningMoreBtnClass
} from '../ui/chartStyles'
import {
  installmentChevronClass,
  installmentHeaderClass,
  installmentPaymentsClass,
  installmentCardClass,
  listCardAmountPillClass,
  listCardSubtitleClass,
  listCardTitleClass,
  walletItemCardClass,
  walletItemInfoClass,
  walletItemTitleRowClass
} from '../ui/featureCardStyles'

type WalletOpeningBalanceCardProps = {
  periodFlow: WalletPeriodFlow
  openingExpanded: boolean
  openingInput: number | ''
  savingOpening: boolean
  loading: boolean
  onToggleExpanded: () => void
  onOpeningInputChange: (value: number | '') => void
  onSave: () => void
  onOpenOpeningBalances?: () => void
}

export default function WalletOpeningBalanceCard({
  periodFlow,
  openingExpanded,
  openingInput,
  savingOpening,
  loading,
  onToggleExpanded,
  onOpeningInputChange,
  onSave,
  onOpenOpeningBalances
}: WalletOpeningBalanceCardProps) {
  const displayOpeningBalance =
    openingInput === '' ? periodFlow.openingBalance ?? 0 : Number(openingInput)

  return (
    <div
      className={cn(
        installmentCardClass({ expanded: openingExpanded }),
        dashboardOpeningCardClass,
        walletItemCardClass
      )}
    >
      <button
        type="button"
        className={cn(installmentHeaderClass(openingExpanded), 'wallet-item-header')}
        onClick={onToggleExpanded}
      >
        <div className={walletItemInfoClass}>
          <div className={walletItemTitleRowClass}>
            <div className={listCardTitleClass}>موجودی اول دوره</div>
            <div className={listCardAmountPillClass} dir="ltr">
              {formatMoney(displayOpeningBalance)}
            </div>
          </div>
          <div className={listCardSubtitleClass}>ابتدای {periodFlow.monthLabel}</div>
        </div>
        <span className={installmentChevronClass}>▼</span>
      </button>

      <AccordionCollapse open={openingExpanded}>
        <div className={cn(installmentPaymentsClass, dashboardOpeningBodyClass)}>
          <p className={dashboardOpeningHintClass}>
            موجودی کیف پول در ابتدای {periodFlow.monthLabel} را وارد کنید. با خالص دوره (درآمد −
            هزینه) جمع می‌شود تا با کیف پول فعلی تطبیق دهید.
          </p>
          <div className={dashboardOpeningFormClass}>
            <div className={dashboardOpeningInputWrapClass}>
              <AmountInput value={openingInput} onChange={onOpeningInputChange} />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={savingOpening || loading}
            >
              {savingOpening ? '...' : 'ذخیره'}
            </Button>
          </div>
          {onOpenOpeningBalances && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={walletOpeningMoreBtnClass}
              onClick={onOpenOpeningBalances}
            >
              گزینه‌های بیشتر
            </Button>
          )}
        </div>
      </AccordionCollapse>
    </div>
  )
}
