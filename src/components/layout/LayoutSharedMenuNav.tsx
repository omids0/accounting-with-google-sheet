import LayoutMenuLink from './LayoutMenuLink'
import LayoutMenuReturnRow from './LayoutMenuReturnRow'
import LayoutMenuSection from './LayoutMenuSection'
import LayoutUpdateItem from './LayoutUpdateItem'
import { MENU_ABOUT_LINK, MENU_APP_LABEL, type MenuLinkEntry } from './navMenuGroups'
import { SHARED_NAV_LINKS } from './sharedTabs'
import type { Tab } from './types'
import { useReturnToPersonal } from '../buildings/useReturnToPersonal'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { appMenuItemsClass } from '../ui/layoutStyles'

const SHARED_MENU_LABEL = 'حساب مشترک'

interface LayoutSharedMenuNavProps {
  tab: Tab
  showSettings: boolean
  onTabChange: (tab: Tab) => void
  onCloseMenu: () => void
}

/**
 * The drawer inside the shared account: the way back to the personal books first, then its four
 * pages (the bottom-nav tabs), then «درباره» and the app update. No personal or building rows.
 */
export default function LayoutSharedMenuNav({
  tab,
  showSettings,
  onTabChange,
  onCloseMenu
}: LayoutSharedMenuNavProps) {
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
      <LayoutMenuReturnRow onClick={returnToPersonal} />
      <LayoutMenuSection label={SHARED_MENU_LABEL}>{SHARED_NAV_LINKS.map(link)}</LayoutMenuSection>
      <LayoutMenuSection label={MENU_APP_LABEL}>
        {link(MENU_ABOUT_LINK)}
        <LayoutUpdateItem />
      </LayoutMenuSection>
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
