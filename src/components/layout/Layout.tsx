import { useEffect, useMemo, useState } from 'react'

import { HeaderSlotsContext } from './headerSlots'
import LayoutBottomNav from './LayoutBottomNav'
import LayoutHeader from './LayoutHeader'
import LayoutMenu from './LayoutMenu'
import LayoutPageOutlet from './LayoutPageOutlet'
import PullToRefresh from './PullToRefresh'
import { useLayoutNavigation } from './useLayoutNavigation'
import { useMainFocus } from './useMainFocus'
import { useBankSmsSync } from '../../hooks/useBankSmsSync'
import { useLaunchAction } from '../../hooks/useLaunchAction'
import { useIsDesktop, useIsTablet } from '../../hooks/useMediaQuery'
import { useIsBuildingWorkspace } from '../../hooks/useWorkspaceType'
import { installSelectionHaptics } from '../../utils/haptics'
import { useBuildingChargeMaintenance } from '../buildings/useBuildingChargeMaintenance'
import PageSpeedDial from '../PageSpeedDial'
import ConflictGate from '../sync/ConflictGate'
import {
  appContentColumnClass,
  appLayoutClass,
  appMainClass,
  appShellClass,
  skipLinkClass
} from '../ui/layoutStyles'
import UpdateBanner from '../UpdateBanner'
import WhatsNewGate from '../whatsNew/WhatsNewGate'

export default function Layout() {
  const {
    tab,
    spreadsheetKey,
    showSettings,
    menuOpen,
    setMenuOpen,
    calcMenuExpanded,
    setCalcMenuExpanded,
    reportsMenuExpanded,
    setReportsMenuExpanded,
    timesheetMenuExpanded,
    setTimesheetMenuExpanded,
    userName,
    userPicture,
    pageSpeedDialConfig,
    showPageSpeedDial,
    openTimesheetsList,
    handleTabChange,
    openSettings,
    showHeaderBack,
    onHeaderBack,
    isCalculationTab,
    isReportTab,
    isTimesheetTab,
    headerTitle
  } = useLayoutNavigation()

  useBankSmsSync()
  useLaunchAction()
  const { mainRef, focusMain } = useMainFocus()
  useEffect(installSelectionHaptics, [])

  const isBuilding = useIsBuildingWorkspace()
  useBuildingChargeMaintenance(isBuilding)
  const isDesktop = useIsDesktop()
  const isTablet = useIsTablet()
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null)
  const [actions, setActions] = useState<HTMLElement | null>(null)
  const [pageEnd, setPageEnd] = useState<HTMLElement | null>(null)
  const headerSlots = useMemo(() => ({ toolbar, actions, pageEnd }), [toolbar, actions, pageEnd])
  // Pull-to-refresh runs the same «بروزرسانی» action the speed dial shows.
  const canPullToRefresh =
    showPageSpeedDial && !!pageSpeedDialConfig?.actions.some(action => action.id === 'refresh')

  return (
    <div className={appLayoutClass} data-workspace={isBuilding ? 'building' : undefined}>
      <a
        href="#main-content"
        className={skipLinkClass}
        onClick={event => {
          event.preventDefault()
          focusMain()
        }}
      >
        پرش به محتوا
      </a>
      <div className={appShellClass}>
        <LayoutMenu
          variant={isDesktop ? 'sidebar' : isTablet ? 'rail' : 'drawer'}
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
          onCloseMenu={() => setMenuOpen(false)}
          userName={userName}
          userPicture={userPicture}
          tab={tab}
          showSettings={showSettings}
          isReportTab={isReportTab}
          isCalculationTab={isCalculationTab}
          isTimesheetTab={isTimesheetTab}
          reportsMenuExpanded={reportsMenuExpanded}
          onToggleReportsMenu={() => setReportsMenuExpanded(value => !value)}
          calcMenuExpanded={calcMenuExpanded}
          onToggleCalcMenu={() => setCalcMenuExpanded(value => !value)}
          timesheetMenuExpanded={timesheetMenuExpanded}
          onToggleTimesheetMenu={() => setTimesheetMenuExpanded(value => !value)}
          onTabChange={handleTabChange}
          onOpenSettings={openSettings}
          onOpenTimesheetsList={openTimesheetsList}
        />

        <HeaderSlotsContext.Provider value={headerSlots}>
          <div className={appContentColumnClass}>
            <LayoutHeader
              menuOpen={menuOpen}
              onToggleMenu={() => setMenuOpen(value => !value)}
              showHeaderBack={showHeaderBack}
              headerTitle={headerTitle}
              showSettings={showSettings}
              onHeaderBack={onHeaderBack}
              toolbarRef={setToolbar}
              actionsRef={setActions}
              pageEndRef={setPageEnd}
            />

            <UpdateBanner />
            <ConflictGate />
            <WhatsNewGate />

            <main id="main-content" ref={mainRef} tabIndex={-1} className={appMainClass}>
              <PullToRefresh enabled={canPullToRefresh} />
              <LayoutPageOutlet spreadsheetKey={spreadsheetKey} showSettings={showSettings} />
            </main>

            {/* A building is navigated from the drawer alone. */}
            {!isBuilding && (
              <LayoutBottomNav
                showSettings={showSettings}
                tab={tab}
                onTabChange={handleTabChange}
              />
            )}

            {showPageSpeedDial && pageSpeedDialConfig && (
              <PageSpeedDial
                actions={pageSpeedDialConfig.actions}
                ariaLabel={pageSpeedDialConfig.ariaLabel}
              />
            )}
          </div>
        </HeaderSlotsContext.Provider>
      </div>
    </div>
  )
}
