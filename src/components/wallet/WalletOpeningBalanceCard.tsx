import type { WalletPeriodFlow } from '../../services/wallet'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import AmountInput from '../AmountInput'

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
      className={`card installment-card interactive-card dashboard-opening-card wallet-item-card${
        openingExpanded ? ' installment-card--expanded' : ''
      }`}
    >
      <button
        type="button"
        className={`installment-header wallet-item-header${
          openingExpanded ? ' installment-header--expanded' : ''
        }`}
        onClick={onToggleExpanded}
      >
        <div className="wallet-item-info">
          <div className="wallet-item-title-row">
            <div className="list-card-title">موجودی اول دوره</div>
            <div className="wallet-item-amount list-card-amount-pill" dir="ltr">
              {formatMoney(displayOpeningBalance)}
            </div>
          </div>
          <div className="wallet-item-note list-card-subtitle">ابتدای {periodFlow.monthLabel}</div>
        </div>
        <span className="installment-chevron">▼</span>
      </button>

      <AccordionCollapse open={openingExpanded}>
        <div className="installment-payments dashboard-opening-body">
          <p className="dashboard-opening-hint">
            موجودی کیف پول در ابتدای {periodFlow.monthLabel} را وارد کنید. با خالص دوره (درآمد −
            هزینه) جمع می‌شود تا با کیف پول فعلی تطبیق دهید.
          </p>
          <div className="dashboard-opening-form">
            <div className="dashboard-opening-input-wrap">
              <AmountInput value={openingInput} onChange={onOpeningInputChange} />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onSave}
              disabled={savingOpening || loading}
            >
              {savingOpening ? '...' : 'ذخیره'}
            </button>
          </div>
          {onOpenOpeningBalances && (
            <button
              type="button"
              className="btn btn-secondary btn-sm wallet-opening-more-btn"
              onClick={onOpenOpeningBalances}
            >
              گزینه‌های بیشتر
            </button>
          )}
        </div>
      </AccordionCollapse>
    </div>
  )
}
