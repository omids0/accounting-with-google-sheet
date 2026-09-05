import { useOutletContext } from 'react-router-dom'

import type { Tab } from '../components/layout/types'
import type { DashboardNavTarget } from '../types'
import type { TabNavigationOptions } from './paths'

export interface LayoutOutletContext {
  onReauth: () => void
  onLogout: () => void
  onDataKeyChange: () => void
  onTabChange: (tab: Tab, options?: TabNavigationOptions) => void
  onOpenRecords: (formType?: 'income' | 'expense') => void
  onOpenEntry: (formType?: 'income' | 'expense') => void
  onNavigateDashboard: (target: DashboardNavTarget) => void
}

export function useLayoutOutletContext(): LayoutOutletContext {
  return useOutletContext<LayoutOutletContext>()
}
