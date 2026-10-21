import { useNavigate } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import BuildingBlock from './BuildingBlock'
import type { Tab } from '../layout/types'
import MoneyText from '../MoneyText'
import { buildingRowTitleClass, buildingRowEndClass } from '../ui/buildingStyles'
import { calmRowClass, calmRowMainClass } from '../ui/calmListStyles'

interface BuildingThisMonthBlockProps {
  expenseCount: number
  expenseTotal: number
  owedToManager: number
  className?: string
}

/** «این ماه»: two links, the month's expenses and what the building owes the manager. */
export default function BuildingThisMonthBlock({
  expenseCount,
  expenseTotal,
  owedToManager,
  className
}: BuildingThisMonthBlockProps) {
  const navigate = useNavigate()

  const rows: { tab: Tab; title: string; amount: number }[] = [
    {
      tab: 'building-expenses',
      title: `هزینه‌ها · ${toPersianDigits(String(expenseCount))} مورد`,
      amount: expenseTotal
    },
    { tab: 'building-dang', title: 'بدهی ساختمان به مدیر', amount: owedToManager }
  ]

  return (
    <BuildingBlock className={className} title="این ماه">
      {rows.map(row => (
        <button
          key={row.tab}
          type="button"
          className={`${calmRowClass} w-full cursor-pointer bg-transparent text-start`}
          onClick={() => navigate(getPathForTab(row.tab))}
        >
          <span className={calmRowMainClass}>
            <span className={buildingRowTitleClass}>{row.title}</span>
          </span>
          <span className={buildingRowEndClass}>
            <MoneyText amount={row.amount} />
          </span>
          <AppIcon name="chevron-left" size={14} />
        </button>
      ))}
    </BuildingBlock>
  )
}
