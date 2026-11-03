import { Link } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import { cn } from '../../utils/cn'
import AppIcon, { type AppIconName } from '../AppIcon'
import {
  dashboardQuickActionClass,
  dashboardQuickActionIconClass,
  dashboardQuickActionIconWrapClass,
  dashboardQuickActionsClass
} from '../ui/dashboardCalmStyles'

const ACTIONS: {
  label: string
  icon: AppIconName
  tone: keyof typeof dashboardQuickActionIconClass
  to: string
}[] = [
  {
    label: 'ثبت درآمد',
    icon: 'add',
    tone: 'income',
    to: getPathForTab('entry', { formType: 'income' })
  },
  {
    label: 'ثبت هزینه',
    icon: 'add',
    tone: 'expense',
    to: getPathForTab('entry', { formType: 'expense' })
  },
  { label: 'انتقال', icon: 'swap', tone: 'neutral', to: '/wallet/transfers' },
  { label: 'چک‌ها', icon: 'checks', tone: 'neutral', to: getPathForTab('checks') }
]

/** Phone shortcuts under the hero: the four things people open the app to do. */
export default function DashboardQuickActions() {
  return (
    <nav className={dashboardQuickActionsClass} aria-label="میان‌بر">
      {ACTIONS.map(action => (
        <Link key={action.label} to={action.to} className={dashboardQuickActionClass}>
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
      ))}
    </nav>
  )
}
