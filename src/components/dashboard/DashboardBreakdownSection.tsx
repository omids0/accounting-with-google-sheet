import { BreakdownRow } from './DashboardParts'
import type { DashboardData, DashboardNavTarget } from '../../types'
import { cn } from '../../utils/cn'
import Card from '../ui/Card'
import {
  assetBreakdownClass,
  chartTitleClass,
  dashboardAssetsCardClass,
  dashboardLiabilitiesCardClass
} from '../ui/chartStyles'

type DashboardBreakdownSectionProps = {
  financial: DashboardData['financial'] | undefined
  onNavigate?: (target: DashboardNavTarget) => void
}

export default function DashboardBreakdownSection({
  financial,
  onNavigate
}: DashboardBreakdownSectionProps) {
  return (
    <>
      <Card className={dashboardAssetsCardClass}>
        <h3 className={chartTitleClass}>دارایی‌ها</h3>
        <div className={assetBreakdownClass}>
          <BreakdownRow
            label="کیف پول"
            value={financial?.walletTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('wallet') : undefined}
          />
          <BreakdownRow
            label="صندوقچه"
            value={financial?.treasuryTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('treasury') : undefined}
          />
          <BreakdownRow
            label="طلب‌ها"
            value={financial?.receivablesTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('receivables') : undefined}
          />
          <BreakdownRow label="مجموع دارایی‌ها" value={financial?.totalAssets ?? 0} total />
        </div>
      </Card>

      <Card className={cn(dashboardAssetsCardClass, dashboardLiabilitiesCardClass)}>
        <h3 className={chartTitleClass}>بدهی‌ها</h3>
        <div className={assetBreakdownClass}>
          <BreakdownRow
            label="اقساط این دوره"
            value={financial?.installmentsDue ?? 0}
            onNavigate={onNavigate ? () => onNavigate('installments') : undefined}
          />
          <BreakdownRow
            label="بدهی‌ها"
            value={financial?.dangsTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('dang') : undefined}
          />
          <BreakdownRow
            label="چک‌های این دوره"
            value={financial?.checksDue ?? 0}
            onNavigate={onNavigate ? () => onNavigate('checks') : undefined}
          />
          <BreakdownRow label="مجموع بدهی‌ها" value={financial?.totalLiabilities ?? 0} total />
        </div>
      </Card>
    </>
  )
}
