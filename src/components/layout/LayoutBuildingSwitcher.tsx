import { useState } from 'react'

import {
  BUILDING_ALL_LINK,
  BUILDING_SWITCHER_LABEL,
  isSwitcherCollapsible,
  type BuildingSwitchRow
} from './buildingSwitcher'
import LayoutMenuLink from './LayoutMenuLink'
import LayoutMenuSection from './LayoutMenuSection'
import type { Tab } from './types'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import {
  appMenuChevronClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuTallItemClass
} from '../ui/layoutStyles'

interface LayoutBuildingSwitcherProps {
  rows: BuildingSwitchRow[]
  /** Current tab, or `null` while another destination (settings) is open. */
  currentTab: Tab | null
  onTabChange: (tab: Tab) => void
  onPick: (buildingId: string) => void
  /** The building being opened right now: its row says so and the others wait. */
  pendingId?: string | null
}

/**
 * «ساختمان‌های من» in the building drawer: every building of the manager with the open one
 * marked, a tap switches to it, and «همهٔ ساختمان‌ها…» opens the home with the cards. Past five
 * buildings the list folds to the open one behind a toggle.
 */
export default function LayoutBuildingSwitcher({
  rows,
  currentTab,
  onTabChange,
  onPick,
  pendingId = null
}: LayoutBuildingSwitcherProps) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = isSwitcherCollapsible(rows)
  const shown = collapsible && !expanded ? rows.filter(row => row.current) : rows

  return (
    <LayoutMenuSection label={BUILDING_SWITCHER_LABEL}>
      {shown.map(row => (
        <button
          key={row.id}
          type="button"
          className={appMenuTallItemClass(row.current)}
          aria-current={row.current ? 'true' : undefined}
          aria-busy={row.id === pendingId ? 'true' : undefined}
          disabled={pendingId !== null}
          onClick={() => onPick(row.id)}
        >
          <span className={appMenuItemIconClass(row.current)}>
            <AppIcon name={row.current ? 'check' : 'building'} size={20} />
          </span>
          <span className={appMenuItemLabelClass}>
            {row.label}
            {row.id === pendingId ? ' · ورود به ساختمان…' : ''}
          </span>
          {row.current && pendingId === null && <span className="sr-only">، ساختمان فعلی</span>}
        </button>
      ))}
      {collapsible && (
        <button
          type="button"
          className={appMenuTallItemClass(false)}
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
        >
          <span className={appMenuItemLabelClass}>
            {expanded
              ? 'جمع کردن فهرست'
              : `نمایش هر ${toPersianDigits(String(rows.length))} ساختمان`}
          </span>
          <span className={appMenuChevronClass(expanded)} aria-hidden="true">
            <AppIcon name="chevron-down" size={16} />
          </span>
        </button>
      )}
      <LayoutMenuLink
        entry={BUILDING_ALL_LINK}
        currentTab={currentTab}
        onTabChange={onTabChange}
        tall
      />
    </LayoutMenuSection>
  )
}
