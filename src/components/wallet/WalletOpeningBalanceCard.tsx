import type { WalletPeriodFlow } from '../../services/wallet'
import { cn } from '../../utils/cn'
import { formatJalaliMonthLabel } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import Button from '../ui/Button'
import {
  dashboardOpeningBodyClass,
  dashboardOpeningCardClass,
  dashboardOpeningHintClass,
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
  onToggleExpanded: () => void
  onOpenOpeningBalances?: () => void
}

export default function WalletOpeningBalanceCard({
  periodFlow,
  openingExpanded,
  onToggleExpanded,
  onOpenOpeningBalances
}: WalletOpeningBalanceCardProps) {
  const isAnchorMonth = periodFlow.monthKey === periodFlow.anchorMonthKey

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
              {formatMoney(periodFlow.openingBalance ?? 0)}
            </div>
          </div>
          <div className={listCardSubtitleClass}>ابتدای {periodFlow.monthLabel}</div>
        </div>
        <span className={installmentChevronClass}>▼</span>
      </button>

      <AccordionCollapse open={openingExpanded}>
        <div className={cn(installmentPaymentsClass, dashboardOpeningBodyClass)}>
          <p className={dashboardOpeningHintClass}>
            {isAnchorMonth
              ? `محاسبه خودکار از این ماه شروع می‌شود، پس این عدد را خودت تعیین می‌کنی و در صفحه موجودی اول دوره قابل ویرایش است. از ماه بعد، موجودی اول دوره خودش از مانده پایان ${periodFlow.monthLabel} حساب می‌شود.`
              : `این عدد خودکار از مانده پایان ماه قبل محاسبه شده و قابل ویرایش نیست. شروع محاسبه: ${formatJalaliMonthLabel(
                  periodFlow.anchorMonthKey
                )}.`}
          </p>
          {onOpenOpeningBalances && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={walletOpeningMoreBtnClass}
              onClick={onOpenOpeningBalances}
            >
              سابقه ماه‌های گذشته
            </Button>
          )}
        </div>
      </AccordionCollapse>
    </div>
  )
}
