import { CHILD_NAV_LINKS } from './childTabs'
import LayoutMenuLink from './LayoutMenuLink'
import LayoutMenuReturnRow from './LayoutMenuReturnRow'
import LayoutMenuSection from './LayoutMenuSection'
import LayoutUpdateItem from './LayoutUpdateItem'
import {
  CHILD_RETURN_LABEL,
  MENU_ABOUT_LINK,
  MENU_APP_LABEL,
  type MenuLinkEntry
} from './navMenuGroups'
import type { Tab } from './types'
import { useReturnToPersonal } from '../buildings/useReturnToPersonal'
import { activeChildName } from '../child/ChildViewBanner'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { appMenuItemsClass } from '../ui/layoutStyles'

interface LayoutChildMenuNavProps {
  tab: Tab
  showSettings: boolean
  onTabChange: (tab: Tab) => void
  onCloseMenu: () => void
}

/**
 * The drawer inside a child's account (a parent looking, nothing to change): the way back to the
 * parent's own books first, then the three read-only pages, then «درباره» and the app update.
 * No settings row and no personal, building or shared rows.
 */
export default function LayoutChildMenuNav({
  tab,
  showSettings,
  onTabChange,
  onCloseMenu
}: LayoutChildMenuNavProps) {
  const { returnToPersonal, modalProps } = useReturnToPersonal(onCloseMenu)
  const currentTab = showSettings ? null : tab

  const link = (entry: MenuLinkEntry) => (
    <LayoutMenuLink
      key={entry.tab}
      entry={entry}
      currentTab={currentTab}
      onTabChange={onTabChange}
    />
  )

  return (
    <div className={appMenuItemsClass}>
      <LayoutMenuReturnRow onClick={returnToPersonal} label={CHILD_RETURN_LABEL} />
      <LayoutMenuSection label={`حساب ${activeChildName()}`}>
        {CHILD_NAV_LINKS.map(link)}
      </LayoutMenuSection>
      <LayoutMenuSection label={MENU_APP_LABEL}>
        {link(MENU_ABOUT_LINK)}
        <LayoutUpdateItem />
      </LayoutMenuSection>
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
