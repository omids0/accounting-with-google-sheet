import AppIcon from '../AppIcon'
import type { Tab } from './types'

interface LayoutBottomNavProps {
  showSettings: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
}

export default function LayoutBottomNav({ showSettings, tab, onTabChange }: LayoutBottomNavProps) {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-side bottom-nav-side--right">
        <button
          className={!showSettings && tab === 'installments' ? 'active' : ''}
          onClick={() => onTabChange('installments')}
        >
          <span className="icon">
            <AppIcon name="installments" />
          </span>
          اقساط
        </button>
        <button
          className={!showSettings && tab === 'dang' ? 'active' : ''}
          onClick={() => onTabChange('dang')}
        >
          <span className="icon">
            <AppIcon name="debt" />
          </span>
          بدهی
        </button>
        <button
          className={!showSettings && tab === 'checks' ? 'active' : ''}
          onClick={() => onTabChange('checks')}
        >
          <span className="icon">
            <AppIcon name="checks" />
          </span>
          چک‌ها
        </button>
      </div>

      <div className="bottom-nav-center">
        <button
          type="button"
          className={`bottom-nav-dashboard${
            !showSettings && (tab === 'dashboard' || tab === 'records') ? ' active' : ''
          }`}
          onClick={() => onTabChange('dashboard')}
          aria-label="داشبورد"
        >
          <span className="bottom-nav-dashboard-icon">
            <AppIcon name="dashboard" size={26} />
          </span>
          <span className="bottom-nav-dashboard-label">داشبورد</span>
        </button>
      </div>

      <div className="bottom-nav-side bottom-nav-side--left">
        <button
          className={!showSettings && tab === 'receivables' ? 'active' : ''}
          onClick={() => onTabChange('receivables')}
        >
          <span className="icon">
            <AppIcon name="receivables" />
          </span>
          طلب‌ها
        </button>
        <button
          className={!showSettings && tab === 'treasury' ? 'active' : ''}
          onClick={() => onTabChange('treasury')}
        >
          <span className="icon">
            <AppIcon name="treasury" />
          </span>
          صندوق
        </button>
        <button
          className={!showSettings && tab === 'wallet' ? 'active' : ''}
          onClick={() => onTabChange('wallet')}
        >
          <span className="icon">
            <AppIcon name="wallet" />
          </span>
          کیف پول
        </button>
      </div>
    </nav>
  )
}
