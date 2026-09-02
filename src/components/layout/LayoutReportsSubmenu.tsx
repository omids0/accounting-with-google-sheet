import type { Tab } from './types'

interface LayoutReportsSubmenuProps {
  tab: Tab
  onTabChange: (tab: Tab) => void
}

export default function LayoutReportsSubmenu({ tab, onTabChange }: LayoutReportsSubmenuProps) {
  return (
    <div className="app-menu-submenu">
      <div className="app-menu-submenu-label">خلاصه</div>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${
          tab === 'report-financial-summary' ? ' active' : ''
        }`}
        onClick={() => onTabChange('report-financial-summary')}
      >
        خلاصه مالی
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${
          tab === 'report-income-expense' ? ' active' : ''
        }`}
        onClick={() => onTabChange('report-income-expense')}
      >
        درآمد و هزینه
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${tab === 'report-cash-flow' ? ' active' : ''}`}
        onClick={() => onTabChange('report-cash-flow')}
      >
        جریان نقدی
      </button>
      <div className="app-menu-submenu-label">ترکیبی</div>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${tab === 'report-due-dates' ? ' active' : ''}`}
        onClick={() => onTabChange('report-due-dates')}
      >
        سررسیدها
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${
          tab === 'report-assets-liabilities' ? ' active' : ''
        }`}
        onClick={() => onTabChange('report-assets-liabilities')}
      >
        دارایی و بدهی
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${
          tab === 'report-opening-balances' ? ' active' : ''
        }`}
        onClick={() => onTabChange('report-opening-balances')}
      >
        موجودی اول دوره
      </button>
      <div className="app-menu-submenu-label">تفصیلی</div>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${tab === 'report-wallet' ? ' active' : ''}`}
        onClick={() => onTabChange('report-wallet')}
      >
        کیف پول
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${tab === 'report-treasury' ? ' active' : ''}`}
        onClick={() => onTabChange('report-treasury')}
      >
        صندوقچه
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${
          tab === 'report-receivables' ? ' active' : ''
        }`}
        onClick={() => onTabChange('report-receivables')}
      >
        طلب‌ها
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${tab === 'report-dang' ? ' active' : ''}`}
        onClick={() => onTabChange('report-dang')}
      >
        بدهی‌ها
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${
          tab === 'report-installments' ? ' active' : ''
        }`}
        onClick={() => onTabChange('report-installments')}
      >
        اقساط
      </button>
      <button
        type="button"
        className={`app-menu-item app-menu-item--sub${tab === 'report-checks' ? ' active' : ''}`}
        onClick={() => onTabChange('report-checks')}
      >
        چک‌ها
      </button>
    </div>
  )
}
