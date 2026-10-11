import { NAV_HINTS } from './navHints'
import { TAB_TITLES, type Tab } from './types'
import {
  appMenuItemLabelClass,
  appMenuPromoHintClass,
  appMenuPromoTextClass
} from '../ui/layoutStyles'

/** Menu item title, with its one-line hint underneath when the tab has one. */
export default function MenuItemLabel({ tab }: { tab: Tab }) {
  const hint = NAV_HINTS[tab]

  if (!hint) return <span className={appMenuItemLabelClass}>{TAB_TITLES[tab]}</span>

  return (
    <span className={appMenuPromoTextClass}>
      <span>{TAB_TITLES[tab]}</span>
      <span className={appMenuPromoHintClass}>{hint}</span>
    </span>
  )
}
