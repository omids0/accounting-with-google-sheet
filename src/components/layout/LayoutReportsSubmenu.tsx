import type { Tab } from './types'
import { appMenuItemClass, appMenuSubmenuClass, appMenuSubmenuLabelClass } from '../ui/layoutStyles'

interface LayoutReportsSubmenuProps {
  tab: Tab
  onTabChange: (tab: Tab) => void
}

export default function LayoutReportsSubmenu({ tab, onTabChange }: LayoutReportsSubmenuProps) {
  return (
    <div className={appMenuSubmenuClass}>
      <div className={appMenuSubmenuLabelClass}>خلاصه</div>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-financial-summary', 'sub')}
        onClick={() => onTabChange('report-financial-summary')}
      >
        خلاصه مالی
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-income-expense', 'sub')}
        onClick={() => onTabChange('report-income-expense')}
      >
        درآمد و هزینه
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-cash-flow', 'sub')}
        onClick={() => onTabChange('report-cash-flow')}
      >
        جریان نقدی
      </button>
      <div className={appMenuSubmenuLabelClass}>ترکیبی</div>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-due-dates', 'sub')}
        onClick={() => onTabChange('report-due-dates')}
      >
        سررسیدها
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-assets-liabilities', 'sub')}
        onClick={() => onTabChange('report-assets-liabilities')}
      >
        دارایی و بدهی
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-opening-balances', 'sub')}
        onClick={() => onTabChange('report-opening-balances')}
      >
        موجودی اول دوره
      </button>
      <div className={appMenuSubmenuLabelClass}>تفصیلی</div>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-wallet', 'sub')}
        onClick={() => onTabChange('report-wallet')}
      >
        کیف پول
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-treasury', 'sub')}
        onClick={() => onTabChange('report-treasury')}
      >
        صندوقچه
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-receivables', 'sub')}
        onClick={() => onTabChange('report-receivables')}
      >
        طلب‌ها
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-dang', 'sub')}
        onClick={() => onTabChange('report-dang')}
      >
        بدهی‌ها
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-installments', 'sub')}
        onClick={() => onTabChange('report-installments')}
      >
        اقساط
      </button>
      <button
        type="button"
        className={appMenuItemClass(tab === 'report-checks', 'sub')}
        onClick={() => onTabChange('report-checks')}
      >
        چک‌ها
      </button>
    </div>
  )
}
