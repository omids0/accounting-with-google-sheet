import { create } from 'zustand'

import type { Tab } from '../components/layout/types'
import type { TabNavigationOptions } from '../routes/paths'
import type { DashboardNavTarget } from '../types'

const noop = () => {}

interface NavigationStore {
  onTabChange: (tab: Tab, options?: TabNavigationOptions) => void
  onOpenRecords: (formType?: 'income' | 'expense') => void
  onOpenEntry: (formType?: 'income' | 'expense') => void
  onNavigateDashboard: (target: DashboardNavTarget) => void
  registerNavigation: (handlers: {
    onTabChange: (tab: Tab, options?: TabNavigationOptions) => void
    onOpenRecords: (formType?: 'income' | 'expense') => void
    onOpenEntry: (formType?: 'income' | 'expense') => void
    onNavigateDashboard: (target: DashboardNavTarget) => void
  }) => void
}

export const useNavigationStore = create<NavigationStore>(set => ({
  onTabChange: noop,
  onOpenRecords: noop,
  onOpenEntry: noop,
  onNavigateDashboard: noop,
  registerNavigation: handlers => set(handlers)
}))
