import { useNavigate } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import CalmBlock from '../CalmBlock'
import type { Tab } from '../layout/types'
import MoneyText from '../MoneyText'
import {
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

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
    <CalmBlock className={className} title="این ماه">
      {rows.map(row => (
        <button
          key={row.tab}
          type="button"
          className={`${calmRowClass} w-full cursor-pointer bg-transparent text-start`}
          onClick={() => navigate(getPathForTab(row.tab))}
        >
          <span className={calmRowMainClass}>
            <span className={calmRowTitleClass}>{row.title}</span>
          </span>
          <span className={calmRowEndClass}>
            <MoneyText amount={row.amount} />
          </span>
          <AppIcon name="chevron-left" size={14} />
        </button>
      ))}
    </CalmBlock>
  )
}
