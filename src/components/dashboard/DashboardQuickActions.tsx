import { Link } from 'react-router'

import { getQuickAction } from './quickActionCatalog'
import ScanInvoiceShortcut from './ScanInvoiceShortcut'
import { useQuickActionsStore } from '../../stores/quickActionsStore'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import {
  dashboardQuickActionClass,
  dashboardQuickActionIconClass,
  dashboardQuickActionIconWrapClass,
  dashboardQuickActionsClass
} from '../ui/dashboardCalmStyles'

/** Phone shortcuts under the hero; the four are the user's pick (Settings › «نمایش»). */
export default function DashboardQuickActions() {
  const ids = useQuickActionsStore(state => state.ids)

  return (
    <nav className={dashboardQuickActionsClass} aria-label="میان‌بر">
      {ids.map(id => {
        const action = getQuickAction(id)

        if (!action) return null
        if (action.kind === 'scan-invoice') return <ScanInvoiceShortcut key={id} action={action} />

        return (
          <Link key={action.id} to={action.to} className={dashboardQuickActionClass}>
            <span
              className={cn(
                dashboardQuickActionIconWrapClass,
                dashboardQuickActionIconClass[action.tone]
              )}
            >
              <AppIcon name={action.icon} size={18} />
            </span>
            {action.label}
          </Link>
        )
      })}
    </nav>
  )
}
