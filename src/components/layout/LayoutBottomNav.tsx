import type { ReactNode } from 'react'

import AppIcon from '../AppIcon'
import type { Tab } from './types'
import { prefetchTabPage } from '../../routes/prefetchPages'
import {
  bottomNavCenterClass,
  bottomNavClass,
  bottomNavDashboardClass,
  bottomNavDashboardIconClass,
  bottomNavDashboardLabelClass,
  bottomNavSideClass,
  bottomNavTabBtnClass,
  bottomNavTabIconClass,
  bottomNavTabLabelClass
} from '../ui/bottomNavStyles'

interface LayoutBottomNavProps {
  showSettings: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
}

interface BottomNavTabButtonProps {
  tab: Tab
  active: boolean
  label: string
  icon: ReactNode
  onTabChange: (tab: Tab) => void
}

function BottomNavTabButton({ tab, active, label, icon, onTabChange }: BottomNavTabButtonProps) {
  return (
    <button
      type="button"
      className={bottomNavTabBtnClass(active)}
      onPointerDown={() => prefetchTabPage(tab)}
      onClick={() => onTabChange(tab)}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <span className={bottomNavTabIconClass(active)}>{icon}</span>
      <span className={bottomNavTabLabelClass}>{label}</span>
    </button>
  )
}

export default function LayoutBottomNav({ showSettings, tab, onTabChange }: LayoutBottomNavProps) {
  const dashboardActive = !showSettings && (tab === 'dashboard' || tab === 'records')

  return (
    <nav className={bottomNavClass} aria-label="ناوبری اصلی">
      <div className={bottomNavSideClass}>
        <BottomNavTabButton
          tab="installments"
          active={!showSettings && tab === 'installments'}
          label="اقساط"
          icon={<AppIcon name="installments" />}
          onTabChange={onTabChange}
        />
        <BottomNavTabButton
          tab="dang"
          active={!showSettings && tab === 'dang'}
          label="بدهی"
          icon={<AppIcon name="debt" />}
          onTabChange={onTabChange}
        />
        <BottomNavTabButton
          tab="checks"
          active={!showSettings && tab === 'checks'}
          label="چک‌ها"
          icon={<AppIcon name="checks" />}
          onTabChange={onTabChange}
        />
      </div>

      <div className={bottomNavCenterClass}>
        <button
          type="button"
          className={bottomNavDashboardClass(dashboardActive)}
          onPointerDown={() => prefetchTabPage('dashboard')}
          onClick={() => onTabChange('dashboard')}
          aria-label="داشبورد"
          aria-current={dashboardActive ? 'page' : undefined}
        >
          <span className={bottomNavDashboardIconClass}>
            <AppIcon name="dashboard" />
          </span>
          <span className={bottomNavDashboardLabelClass}>داشبورد</span>
        </button>
      </div>

      <div className={bottomNavSideClass}>
        <BottomNavTabButton
          tab="receivables"
          active={!showSettings && tab === 'receivables'}
          label="طلب‌ها"
          icon={<AppIcon name="receivables" />}
          onTabChange={onTabChange}
        />
        <BottomNavTabButton
          tab="treasury"
          active={!showSettings && tab === 'treasury'}
          label="صندوق"
          icon={<AppIcon name="treasury" />}
          onTabChange={onTabChange}
        />
        <BottomNavTabButton
          tab="wallet"
          active={!showSettings && tab === 'wallet'}
          label="کیف پول"
          icon={<AppIcon name="wallet" />}
          onTabChange={onTabChange}
        />
      </div>
    </nav>
  )
}
