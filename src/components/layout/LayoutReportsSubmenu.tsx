import { Fragment } from 'react'

import TabNavLink from './TabNavLink'
import type { Tab } from './types'
import { appMenuItemClass, appMenuSubmenuClass, appMenuSubmenuLabelClass } from '../ui/layoutStyles'

interface LayoutReportsSubmenuProps {
  tab: Tab
  onTabChange: (tab: Tab) => void
}

const REPORT_MENU_GROUPS: { label: string; items: { tab: Tab; label: string }[] }[] = [
  {
    label: 'خلاصه',
    items: [
      { tab: 'report-financial-summary', label: 'خلاصه مالی' },
      { tab: 'report-income-expense', label: 'درآمد و هزینه' },
      { tab: 'report-cash-flow', label: 'جریان نقدی' },
      { tab: 'report-category-tree', label: 'درختواره درآمد/هزینه' }
    ]
  },
  {
    label: 'ترکیبی',
    items: [
      { tab: 'report-due-dates', label: 'سررسیدها' },
      { tab: 'report-assets-liabilities', label: 'دارایی و بدهی' },
      { tab: 'report-opening-balances', label: 'موجودی اول دوره' }
    ]
  },
  {
    label: 'تفصیلی',
    items: [
      { tab: 'report-wallet', label: 'کیف پول' },
      { tab: 'report-treasury', label: 'صندوقچه' },
      { tab: 'report-receivables', label: 'طلب‌ها' },
      { tab: 'report-dang', label: 'بدهی‌ها' },
      { tab: 'report-installments', label: 'اقساط' },
      { tab: 'report-checks', label: 'چک‌ها' }
    ]
  }
]

export default function LayoutReportsSubmenu({ tab, onTabChange }: LayoutReportsSubmenuProps) {
  return (
    <div className={appMenuSubmenuClass}>
      {REPORT_MENU_GROUPS.map(group => (
        <Fragment key={group.label}>
          <div className={appMenuSubmenuLabelClass}>{group.label}</div>
          {group.items.map(item => (
            <TabNavLink
              key={item.tab}
              tab={item.tab}
              active={tab === item.tab}
              className={appMenuItemClass(tab === item.tab, 'sub')}
              onNavigate={() => onTabChange(item.tab)}
            >
              {item.label}
            </TabNavLink>
          ))}
        </Fragment>
      ))}
    </div>
  )
}
