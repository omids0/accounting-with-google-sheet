import { buildingSwitchRows } from './buildingSwitcher'
import LayoutBuildingSwitcher from './LayoutBuildingSwitcher'
import LayoutMenuLink from './LayoutMenuLink'
import LayoutMenuReturnRow from './LayoutMenuReturnRow'
import LayoutMenuSection from './LayoutMenuSection'
import LayoutUpdateItem from './LayoutUpdateItem'
import type { Tab } from './types'
import { useBuildingMenuGroups } from './useBuildingMenuGroups'
import { getSettings, getSpreadsheets } from '../../services/settings'
import { useAppStore } from '../../stores/appStore'
import { useEnterBuilding } from '../buildings/useEnterBuilding'
import { useReturnToPersonal } from '../buildings/useReturnToPersonal'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { appMenuItemsClass } from '../ui/layoutStyles'

interface LayoutBuildingMenuNavProps {
  tab: Tab
  showSettings: boolean
  onTabChange: (tab: Tab) => void
  onCloseMenu: () => void
}

/**
 * The drawer inside a building workspace: the way back to the personal books first, then the
 * switcher between the manager's buildings, then the building's own groups.
 */
export default function LayoutBuildingMenuNav({
  tab,
  showSettings,
  onTabChange,
  onCloseMenu
}: LayoutBuildingMenuNavProps) {
  const groups = useBuildingMenuGroups()
  const { returnToPersonal, modalProps } = useReturnToPersonal(onCloseMenu)
  const { enter, entering, modalProps: enterModalProps } = useEnterBuilding(onCloseMenu)
  // Bumped on every sheet switch; the registry itself is read again on each render of the drawer.
  useAppStore(state => state.spreadsheetKey)
  const rows = buildingSwitchRows(getSpreadsheets(), getSettings()?.spreadsheetId ?? '')
  const currentTab = showSettings ? null : tab

  return (
    <div className={appMenuItemsClass}>
      <LayoutMenuReturnRow onClick={returnToPersonal} />
      <LayoutBuildingSwitcher
        rows={rows}
        currentTab={currentTab}
        onTabChange={onTabChange}
        onPick={id => void enter(id)}
        pendingId={entering}
      />
      {groups.map((group, index) => (
        <LayoutMenuSection key={group.label} label={group.label}>
          {group.links.map(entry => (
            <LayoutMenuLink
              key={entry.tab}
              entry={entry}
              currentTab={currentTab}
              onTabChange={onTabChange}
            />
          ))}
          {index === groups.length - 1 && <LayoutUpdateItem />}
        </LayoutMenuSection>
      ))}
      <SheetSwitchConfirmModal {...modalProps} />
      <SheetSwitchConfirmModal {...enterModalProps} />
    </div>
  )
}
