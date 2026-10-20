import LayoutMenuLink from './LayoutMenuLink'
import LayoutMenuSection from './LayoutMenuSection'
import LayoutUpdateItem from './LayoutUpdateItem'
import { BUILDING_RETURN_LABEL } from './navMenuGroups'
import type { Tab } from './types'
import { useBuildingMenuGroups } from './useBuildingMenuGroups'
import AppIcon from '../AppIcon'
import { useReturnToPersonal } from '../buildings/useReturnToPersonal'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import {
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuItemsClass
} from '../ui/layoutStyles'

interface LayoutBuildingMenuNavProps {
  tab: Tab
  showSettings: boolean
  onTabChange: (tab: Tab) => void
  onCloseMenu: () => void
}

/** The drawer inside a building workspace: its own groups, then the way back to the personal books. */
export default function LayoutBuildingMenuNav({
  tab,
  showSettings,
  onTabChange,
  onCloseMenu
}: LayoutBuildingMenuNavProps) {
  const groups = useBuildingMenuGroups()
  const { returnToPersonal, modalProps } = useReturnToPersonal(onCloseMenu)
  const linkProps = { currentTab: showSettings ? null : tab, onTabChange }

  return (
    <div className={appMenuItemsClass}>
      {groups.map((group, index) => (
        <LayoutMenuSection key={group.label} label={group.label}>
          {group.links.map(entry => (
            <LayoutMenuLink key={entry.tab} entry={entry} {...linkProps} />
          ))}
          {index === groups.length - 1 && <LayoutUpdateItem />}
        </LayoutMenuSection>
      ))}
      <button type="button" className={appMenuItemClass(false)} onClick={returnToPersonal}>
        <span className={appMenuItemIconClass(false)}>
          <AppIcon name="return" size={20} />
        </span>
        <span className={appMenuItemLabelClass}>{BUILDING_RETURN_LABEL}</span>
      </button>
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
