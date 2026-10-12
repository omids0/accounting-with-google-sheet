import { useMemo, useState } from 'react'

import { HeaderSlotsContext } from './headerSlots'
import LayoutBottomNav from './LayoutBottomNav'
import LayoutHeader from './LayoutHeader'
import LayoutMenu from './LayoutMenu'
import LayoutPageOutlet from './LayoutPageOutlet'
import PageSpeedDial from '../PageSpeedDial'
import UpdateBanner from '../UpdateBanner'
import { useLayoutNavigation } from './useLayoutNavigation'
import { useBankSmsSync } from '../../hooks/useBankSmsSync'
import { useIsDesktop, useIsTablet } from '../../hooks/useMediaQuery'
import {
  appContentColumnClass,
  appLayoutClass,
  appMainClass,
  appShellClass
} from '../ui/layoutStyles'

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

  const isDesktop = useIsDesktop()
  const isTablet = useIsTablet()
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null)
  const [actions, setActions] = useState<HTMLElement | null>(null)
  const headerSlots = useMemo(() => ({ toolbar, actions }), [toolbar, actions])

  return (
    <div className={appLayoutClass}>
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
            />

            <UpdateBanner />

            <main className={appMainClass}>
              <LayoutPageOutlet spreadsheetKey={spreadsheetKey} showSettings={showSettings} />
            </main>

            <LayoutBottomNav showSettings={showSettings} tab={tab} onTabChange={handleTabChange} />

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
