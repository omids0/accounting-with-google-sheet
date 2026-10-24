import { getNetAvailableConfig } from '../../services/settings'
import type { FinancialSummary, NetAvailableConfig } from '../../types'
import CalmBlock from '../CalmBlock'
import MoneyText from '../MoneyText'
import {
  calmListClass,
  calmNoteClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

/** Names of the parts counted in each total, in the order the breakdown view lists them. */
export function selectedPartLabels(
  config: NetAvailableConfig,
  hasGoals = false,
  hasReceivedChecks = false
): {
  assets: string[]
  liabilities: string[]
} {
  const assets = [
    config.assets.wallet && 'کیف پول',
    config.assets.treasury && 'صندوقچه',
    config.assets.goals && hasGoals && 'هدف‌ها',
    config.assets.receivables && 'طلب‌ها',
    config.assets.checksReceived && hasReceivedChecks && 'چک‌های دریافتی'
  ]
  const liabilities = [
    config.liabilities.installments && 'اقساط این دوره',
    config.liabilities.checks && 'چک‌های پرداختی',
    config.liabilities.dangs && 'بدهی'
  ]

  return {
    assets: assets.filter((label): label is string => !!label),
    liabilities: liabilities.filter((label): label is string => !!label)
  }
}

/** «دارایی و بدهی»: the two selected totals; «جزئیات ←» opens the full breakdown. */
export default function DashboardBalanceBlock({
  financial,
  onDetails,
  config = getNetAvailableConfig(),
  className
}: {
  className?: string
  financial: FinancialSummary
  onDetails: () => void
  config?: NetAvailableConfig
}) {
  const parts = selectedPartLabels(
    config,
    (financial.goalsTotal ?? 0) > 0,
    (financial.checksReceivable ?? 0) > 0
  )

  const rows = [
    {
      title: 'دارایی‌های منتخب',
      sub: parts.assets.join(' · ') || 'هیچ موردی انتخاب نشده',
      value: <MoneyText amount={financial.totalAssets} />,
      tone: 'text-success'
    },
    {
      title: 'بدهی‌های منتخب',
      sub: parts.liabilities.join(' · ') || 'هیچ موردی انتخاب نشده',
      value: <MoneyText amount={-financial.totalLiabilities} signed />,
      tone: 'text-danger'
    }
  ]

  return (
    <CalmBlock
      className={className}
      title="دارایی و بدهی"
      action={{ label: 'جزئیات ←', onClick: onDetails }}
    >
      <ul className={calmListClass}>
        {rows.map(row => (
          <li key={row.title} className={calmRowClass}>
            <span className={calmRowMainClass}>
              <span className={calmRowTitleClass}>{row.title}</span>
              <span className={calmRowSubClass}>{row.sub}</span>
            </span>
            <span className={`${calmRowEndClass} ${row.tone}`}>{row.value}</span>
          </li>
        ))}
      </ul>
      <p className={calmNoteClass}>تفاوت این دو = دارایی قابل اتکا</p>
    </CalmBlock>
  )
}
