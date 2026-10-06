import type { ReactNode } from 'react'

import AppIcon from '../AppIcon'
import type { AppIconName } from '../appIcon/types'
import {
  appMenuChevronClass,
  appMenuGroupClass,
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuSubmenuClass
} from '../ui/layoutStyles'

interface LayoutMenuGroupProps {
  label: string
  icon: AppIconName
  active: boolean
  expanded: boolean
  onToggle: () => void
  /** Wrap children in the shared submenu container (reports render their own). */
  submenu?: boolean
  children: ReactNode
}

/** Collapsible side-menu section: a toggle row plus its sub-links. */
export default function LayoutMenuGroup({
  label,
  icon,
  active,
  expanded,
  onToggle,
  submenu = false,
  children
}: LayoutMenuGroupProps) {
  return (
    <div className={appMenuGroupClass}>
      <button
        type="button"
        className={appMenuItemClass(active, 'parent')}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={appMenuItemIconClass(active)}>
          <AppIcon name={icon} size={20} strokeWidth={1.75} />
        </span>
        <span className={appMenuItemLabelClass}>{label}</span>
        <span className={appMenuChevronClass(expanded)} aria-hidden="true">
          <AppIcon name="chevron-down" size={16} strokeWidth={2} />
        </span>
      </button>
      {expanded && (submenu ? <div className={appMenuSubmenuClass}>{children}</div> : children)}
    </div>
  )
}
