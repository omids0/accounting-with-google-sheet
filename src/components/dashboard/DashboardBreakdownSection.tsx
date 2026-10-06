import { BreakdownRow } from './DashboardParts'
import { getNetAvailableConfig } from '../../services/settings'
import type { DashboardData, DashboardNavTarget, NetAvailableConfig } from '../../types'
import Card from '../ui/Card'
import {
  assetBreakdownClass,
  assetSettingsHintClass,
  chartTitleClass,
  dashboardAssetsCardClass,
  dashboardLiabilitiesCardClass
} from '../ui/chartStyles'

type Financial = DashboardData['financial']

type BreakdownItem = {
  label: string
  value: number
  included: boolean
  target: DashboardNavTarget
}

type DashboardBreakdownSectionProps = {
  financial: Financial | undefined
  onNavigate?: (target: DashboardNavTarget) => void
  /** Opens «دارایی قابل اتکا» settings; shown as a hint when a row is left out. */
  onConfigure?: () => void
  config?: NetAvailableConfig
}

function BreakdownCard({
  title,
  className,
  items,
  totalLabel,
  total,
  onNavigate,
  onConfigure
}: {
  title: string
  className: string
  items: BreakdownItem[]
  totalLabel: string
  total: number
  onNavigate?: (target: DashboardNavTarget) => void
  onConfigure?: () => void
}) {
  const hasExcluded = items.some(item => !item.included)

  return (
    <Card className={className}>
      <h3 className={chartTitleClass}>{title}</h3>
      <div className={assetBreakdownClass}>
        {items.map(item => (
          <BreakdownRow
            key={item.target}
            label={item.label}
            value={item.value}
            excluded={!item.included}
            onNavigate={onNavigate ? () => onNavigate(item.target) : undefined}
          />
        ))}
        <BreakdownRow label={totalLabel} value={total} total />
        {hasExcluded && onConfigure && (
          <button type="button" className={assetSettingsHintClass} onClick={onConfigure}>
            ردیف‌های «لحاظ نشده» در مجموع نیامده‌اند — تنظیم دارایی قابل اتکا
          </button>
        )}
      </div>
    </Card>
  )
}

export default function DashboardBreakdownSection({
  financial,
  onNavigate,
  onConfigure,
  config = getNetAvailableConfig()
}: DashboardBreakdownSectionProps) {
  const assets: BreakdownItem[] = [
    {
      label: 'کیف پول',
      value: financial?.walletTotal ?? 0,
      included: config.assets.wallet,
      target: 'wallet'
    },
    {
      label: 'صندوقچه',
      value: financial?.treasuryTotal ?? 0,
      included: config.assets.treasury,
      target: 'treasury'
    },
    {
      label: 'طلب‌ها',
      value: financial?.receivablesTotal ?? 0,
      included: config.assets.receivables,
      target: 'receivables'
    }
  ]

  const liabilities: BreakdownItem[] = [
    {
      label: 'اقساط این دوره',
      value: financial?.installmentsDue ?? 0,
      included: config.liabilities.installments,
      target: 'installments'
    },
    {
      label: 'بدهی‌ها',
      value: financial?.dangsTotal ?? 0,
      included: config.liabilities.dangs,
      target: 'dang'
    },
    {
      label: 'چک‌های این دوره',
      value: financial?.checksDue ?? 0,
      included: config.liabilities.checks,
      target: 'checks'
    }
  ]

  return (
    <>
      <BreakdownCard
        title="دارایی‌ها"
        className={dashboardAssetsCardClass}
        items={assets}
        totalLabel="مجموع دارایی‌های منتخب"
        total={financial?.totalAssets ?? 0}
        onNavigate={onNavigate}
        onConfigure={onConfigure}
      />
      <BreakdownCard
        title="بدهی‌ها"
        className={dashboardLiabilitiesCardClass}
        items={liabilities}
        totalLabel="مجموع بدهی‌های منتخب"
        total={financial?.totalLiabilities ?? 0}
        onNavigate={onNavigate}
        onConfigure={onConfigure}
      />
    </>
  )
}
