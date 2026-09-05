import AppIcon from '../AppIcon'
import type { Tab } from './types'
import {
  bottomNavCenterClass,
  bottomNavClass,
  bottomNavDashboardClass,
  bottomNavDashboardIconClass,
  bottomNavDashboardLabelClass,
  bottomNavSideClass,
  bottomNavTabBtnClass,
  bottomNavTabIconClass
} from '../ui/layoutStyles'

interface LayoutBottomNavProps {
  showSettings: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
}

export default function LayoutBottomNav({ showSettings, tab, onTabChange }: LayoutBottomNavProps) {
  const dashboardActive = !showSettings && (tab === 'dashboard' || tab === 'records')

  return (
    <nav className={bottomNavClass}>
      <div className={bottomNavSideClass}>
        <button
          className={bottomNavTabBtnClass(!showSettings && tab === 'installments')}
          onClick={() => onTabChange('installments')}
        >
          <span className={bottomNavTabIconClass(!showSettings && tab === 'installments')}>
            <AppIcon name="installments" />
          </span>
          اقساط
        </button>
        <button
          className={bottomNavTabBtnClass(!showSettings && tab === 'dang')}
          onClick={() => onTabChange('dang')}
        >
          <span className={bottomNavTabIconClass(!showSettings && tab === 'dang')}>
            <AppIcon name="debt" />
          </span>
          بدهی
        </button>
        <button
          className={bottomNavTabBtnClass(!showSettings && tab === 'checks')}
          onClick={() => onTabChange('checks')}
        >
          <span className={bottomNavTabIconClass(!showSettings && tab === 'checks')}>
            <AppIcon name="checks" />
          </span>
          چک‌ها
        </button>
      </div>

      <div className={bottomNavCenterClass}>
        <button
          type="button"
          className={bottomNavDashboardClass(dashboardActive)}
          onClick={() => onTabChange('dashboard')}
          aria-label="داشبورد"
        >
          <span className={bottomNavDashboardIconClass}>
            <AppIcon name="dashboard" size={26} />
          </span>
          <span className={bottomNavDashboardLabelClass}>داشبورد</span>
        </button>
      </div>

      <div className={bottomNavSideClass}>
        <button
          className={bottomNavTabBtnClass(!showSettings && tab === 'receivables')}
          onClick={() => onTabChange('receivables')}
        >
          <span className={bottomNavTabIconClass(!showSettings && tab === 'receivables')}>
            <AppIcon name="receivables" />
          </span>
          طلب‌ها
        </button>
        <button
          className={bottomNavTabBtnClass(!showSettings && tab === 'treasury')}
          onClick={() => onTabChange('treasury')}
        >
          <span className={bottomNavTabIconClass(!showSettings && tab === 'treasury')}>
            <AppIcon name="treasury" />
          </span>
          صندوق
        </button>
        <button
          className={bottomNavTabBtnClass(!showSettings && tab === 'wallet')}
          onClick={() => onTabChange('wallet')}
        >
          <span className={bottomNavTabIconClass(!showSettings && tab === 'wallet')}>
            <AppIcon name="wallet" />
          </span>
          کیف پول
        </button>
      </div>
    </nav>
  )
}
